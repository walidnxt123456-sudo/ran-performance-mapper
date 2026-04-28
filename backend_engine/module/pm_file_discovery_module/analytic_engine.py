import sys
import pandas as pd
from typing import Dict, Any
import json

class AnalyticEngine:
    """
    Layer 3: Analytics Engine.
    Strictly follows the ModuleConfig contract for RadioRCA.
    No normalization: uses raw identity columns for Day, Hour, Cell, and KPI.
    """
    def __init__(self):
        self.results = {}  # Structure: { cell_id: { kpi_name: { value, busy_hour } } }
        self.processed_kpis = []
        self.processed_cells = []

    def process_extraction(self, df: pd.DataFrame, config: Any):
        cid = config.cell_identity_column
        day = config.date_identity_column
        hour = getattr(config, 'hour_identity_column', None)

        kpi_cols = config.kpi_identity_column
        if isinstance(kpi_cols, str):
            kpi_cols = [kpi_cols]
        
        # Track metadata for OuputExtractionConfig
        self.processed_kpis = list(set(self.processed_kpis + kpi_cols))

        # 1. Cell filter
        if config.target_cells:
            targets = [config.target_cells] if isinstance(config.target_cells, str) else config.target_cells
            df = df[df[cid].astype(str).str.strip().isin(targets)]

        # 2. Date filter
        if config.target_date:
            target_days = [config.target_date] if isinstance(config.target_date, str) else config.target_date
            df = df[df[day].astype(str).str.strip().isin(target_days)]

        if df.empty:
            return
            
        self.processed_cells = list(set(self.processed_cells + df[cid].astype(str).unique().tolist()))

        # 3. Calculation
        mode = getattr(config, 'extraction_mode', 'avg')
        for kpi in kpi_cols:
            if kpi not in df.columns:
                continue
            
            if mode == "bh":
                self._calculate_busy_hour(df, cid, kpi, hour)
            else:
                self._calculate_averages(df, cid, kpi)

    def _calculate_averages(self, df: pd.DataFrame, cid: str, kpi: str):
        avg_series = df.groupby(cid)[kpi].mean()
        for cell, val in avg_series.items():
            cell_str = str(cell)
            if cell_str not in self.results:
                self.results[cell_str] = {}
            # Follows OuputExtractionConfig data structure
            self.results[cell_str][kpi] = {
                "value": round(float(val), 2),
                "busy_hour": None
            }

    def _calculate_busy_hour(self, df: pd.DataFrame, cid: str, kpi: str, hour_col: str):
        idx = df.groupby(cid)[kpi].idxmax()
        peak_df = df.loc[idx]

        for _, row in peak_df.iterrows():
            cell_id = str(row[cid])
            val = float(row[kpi])
            timestamp = str(row[hour_col]) if hour_col and hour_col in row else "N/A"

            if cell_id not in self.results:
                self.results[cell_id] = {}

            # Follows OuputExtractionConfig data structure
            self.results[cell_id][kpi] = {
                "value": val,
                "busy_hour": timestamp 
            }
                

    def run_discovery_scan(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Returns raw metadata for the Discovery Mode 'Menu'.
        Automatically detects potential date, cell, and hour columns to provide selection hints.
        """
        DATE_KEYWORDS = ["Date", "DATE_ID", "DateID", "day", "period_start_time"]
        CELL_KEYWORDS = ["Cell", "EUtranCell Id", "CellID", "Object", "NE Name"]
        HOUR_KEYWORDS = ["Hour", "Time", "Period", "Interval", "HOUR_ID"]
        
        column_map = {str(col).strip().lower(): col for col in df.columns}
        
        detected_date_col = next((column_map[kw.lower()] for kw in DATE_KEYWORDS if kw.lower() in column_map), None)
        detected_cell_col = next((column_map[kw.lower()] for kw in CELL_KEYWORDS if kw.lower() in column_map), None)
        hour_column_found = next((column_map[kw.lower()] for kw in HOUR_KEYWORDS if kw.lower() in column_map), None)

        available_dates = []
        if detected_date_col:
            available_dates = df[detected_date_col].dropna().astype(str).str.strip().unique().tolist()
            

        # Strictly follow OuputDiscoveryConfig in models.py
        return {
            "file_path": "", 
            "mode": "discovery",
            "column_list": df.columns.tolist(),
            "date_available": available_dates,
            "hour_column_found": hour_column_found,
            # Pass hints to PM Controller for its internal logic
            "detected_date_column": detected_date_col,
            "detected_cell_column": detected_cell_col,
            "sample_rows": json.loads(df.head(5).to_json(orient='records'))
        }

    def get_results(self) -> Dict[str, Any]:
        # Wraps results to match the OuputExtractionConfig schema
        return {
            "processed_kpis": self.processed_kpis,
            "processed_cells": self.processed_cells,
            "data": self.results
        }