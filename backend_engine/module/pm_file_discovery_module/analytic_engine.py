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
        self.results = {}

    def process_extraction(self, df: pd.DataFrame, config: Any):
        cid = config.cell_identity_column
        day = config.date_identity_column
        hour = getattr(config, 'hour_identity_column', None)

        # kpi can be str or list
        kpi_cols = config.kpi_identity_column
        if isinstance(kpi_cols, str):
            kpi_cols = [kpi_cols]

        # Cell filter
        if config.target_cells:
            targets = [config.target_cells] if isinstance(config.target_cells, str) else config.target_cells
            print(f"[DEBUG] cell values in parquet (sample): {df[cid].astype(str).str.strip().unique().tolist()[:8]}")
            df = df[df[cid].astype(str).str.strip().isin(targets)]
            print(f"[DEBUG] rows after CELL filter: {len(df)}")

        # Date filter - handle Excel serial int/float vs string
        # Filtering Logic (Target Dates) - Auto-detect format
        if config.target_date:
            if isinstance(config.target_date, str):
                config.target_date = [config.target_date]

            date_col_series = df[day].astype(str).str.strip()
            sample = date_col_series.dropna().iloc[0] if not date_col_series.empty else ""

            # Detect if CSV contains Excel serials (large numbers like 45992)
            try:
                sample_num = float(sample.replace('.0', ''))
                is_excel_serial = sample_num > 40000
            except ValueError:
                is_excel_serial = False

            if is_excel_serial:
                # Normalize both sides to strip .0
                date_series = date_col_series.str.replace(r'\.0$', '', regex=True)
                target_as_str = [str(d).replace('.0', '') for d in config.target_date]
            else:
                # CSV has real date strings - use as-is, no conversion
                date_series = date_col_series
                target_as_str = [str(d) for d in config.target_date]

            print(f"[DEBUG] is_excel_serial: {is_excel_serial}")
            print(f"[DEBUG] date_series sample: {date_series.head(3).tolist()}")
            print(f"[DEBUG] target_as_str: {target_as_str}")

            df = df[date_series.isin(target_as_str)]
            print(f"[DEBUG] rows after DATE filter: {len(df)}")

        if df.empty:
            print("[DEBUG] df is empty after filters, returning.")
            return

        # Process each KPI column
        for kpi in kpi_cols:
            df[kpi] = pd.to_numeric(df[kpi], errors='coerce').fillna(0)
            if config.extraction_mode == "avg":
                self._calculate_averages(df, cid, kpi, day)
            elif config.extraction_mode == "bh":
                self._calculate_busy_hour(df, cid, kpi, day, hour)

    def _calculate_averages(self, df: pd.DataFrame, cid: str, kpi: str, day: str):
        """Calculates mean KPI and captures the date."""
        # Group by cell to get the average
        avg_map = df.groupby(cid)[kpi].mean().to_dict()
        
        for cell, val in avg_map.items():
            if cell not in self.results:
                self.results[cell] = {}
            
            # Pull the date from the first row of the filtered dataframe
            if cell in avg_map and not df.empty:
                cell_rows = df[df[cid] == cell]
                # For BH mode, you want the peak's date; for AVG, any date is fine
                date_val = str(cell_rows[day].iloc[0])
                        
            self.results[cell]["average_kpi"] = round(val, 2)
            self.results[cell]["date"] = date_val

    def _calculate_busy_hour(self, df: pd.DataFrame, cid: str, kpi: str, day: str, hour: str):
        """Identifies the peak value and its timestamp (Day + Hour)."""
        df_sorted = df.sort_values(by=[cid, kpi], ascending=[True, False])
        peaks = df_sorted.drop_duplicates(subset=[cid])

        for _, row in peaks.iterrows():
            cell_id = row[cid]
            new_peak_val = row[kpi]
            
            timestamp = f"{row[day]}"
            if hour and hour in row:
                try:
                    # 1. Convert to float first to handle potential strings
                    # 2. Convert to int to remove the '.0' decimal
                    # 3. Use zfill(2) if you want leading zeros (e.g., '06' instead of '6')
                    h_val = str(int(float(row[hour]))).zfill(2)
                    timestamp = f"{row[day]} @ {h_val}:00"
                except (ValueError, TypeError):
                    # Fallback if the hour value is not numeric
                    timestamp = f"{row[day]} @ {row[hour]}"

            current_stored = self.results.get(cell_id, {}).get("peak_value", -999)
            
            if new_peak_val > current_stored:
                self.results[cell_id] = {
                    "peak_value": new_peak_val,
                    "busy_hour": timestamp 
                }
                

    def run_discovery_scan(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Returns raw metadata for the Discovery Mode 'Menu'.
        Automatically detects potential date columns to provide selection hints.
        """
        DATE_KEYWORDS = ["Date", "DATE_ID", "DateID", "day", "period_start_time"]
        available_dates = []
        detected_date_col = None

        # 1. Self-detect the date column based on keywords
        # We look for an exact (case-insensitive) match in the raw columns
        column_map = {str(col).strip().lower(): col for col in df.columns}
        
        for kw in DATE_KEYWORDS:
            if kw.lower() in column_map:
                detected_date_col = column_map[kw.lower()]
                break

        # 2. Extract unique dates if a column was found
        if detected_date_col:
            # Drop empty values and convert to string for JSON safety
            available_dates = df[detected_date_col].dropna().astype(str).str.strip().unique().tolist()

        return {
            "columns": df.columns.tolist(),
            "detected_date_column": detected_date_col, # Help the UI auto-select
            "available_dates": available_dates,
            "sample_rows": json.loads(df.head(5).to_json(orient='records'))
        }

    def get_results(self) -> Dict[str, Any]:
        """Returns the final extraction results."""
        return self.results