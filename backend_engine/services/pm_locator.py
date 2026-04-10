# backend_engine/services/pm_locator.py
from pathlib import Path
import pandas as pd
from backend_engine.infrastructure.csv_reader import CsvReader

class PmLocator:
    def __init__(self):
        self.reader = CsvReader()
        self.pm_dir = Path("data/pm")

    def discover_files_and_kpis(self):
        """MODE A: Scans the directory and returns metadata only (no heavy loading)."""
        if not self.pm_dir.exists():
            self.pm_dir.mkdir(parents=True, exist_ok=True)
            return []

        discovered = []
        # Look for CSV and Excel files
        for file_path in self.pm_dir.glob("*.*"):
            if file_path.suffix.lower() not in ['.csv', '.xlsx', '.xls']:
                continue
            
            # Read just the header to get KPI names
            df = self.reader.read_pm_data(file_path)
            if df is not None:
                # Exclude non-KPI columns
                meta = ["date", "erbs id", "eutrancell id", "object", "cell id"]
                kpis = [c for c in df.columns if c.lower() not in meta]
                
                discovered.append({
                    "file_name": file_path.name,
                    "kpis": kpis
                })
        return discovered

    def extract_specific_kpis(self, file_name, kpi_name, cell_list):
        """MODE B: Targeted extraction for specific cells and one KPI."""
        file_path = self.pm_dir / file_name
        df = self.reader.read_pm_data(file_path)
        
        if df is None: return {}

        # Standardize column search
        cell_col = next((c for c in df.columns if "cell" in c.lower()), None)
        
        if not cell_col: return {}

        # Filter the dataframe for our nearest cells and the requested KPI
        filtered_df = df[df[cell_col].isin(cell_list)]
        
        # Return a simple map: { "CELL_ID": VALUE }
        return filtered_df.set_index(cell_col)[kpi_name].to_dict()