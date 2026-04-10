# backend_engine/services/pm_service.py
from pathlib import Path
from backend_engine.infrastructure.csv_reader import CsvReader
from backend_engine.utils.debug_logger import setup_logger # Add this

log = setup_logger("PM_SERVICE") # Initialize logger

class PmService:
    def __init__(self):
        self.reader = CsvReader()
        self.pm_dir = Path("data/pm")

    def get_pm_metadata(self):
        """MODE A: Scans directory and extracts available KPI columns."""
        log.info(f"Scanning directory: {self.pm_dir.absolute()}") # Log the path
        
        if not self.pm_dir.exists():
            log.warning("PM directory does not exist. Creating it.")
            self.pm_dir.mkdir(parents=True, exist_ok=True)
            return []

        discovery_results = []
        files = list(self.pm_dir.glob("*.*"))
        log.info(f"Found {len(files)} potential files in PM folder.")

        for file_path in files:
            if file_path.suffix.lower() not in ['.csv', '.xlsx', '.xls']:
                continue
            
            log.info(f"Processing headers for: {file_path.name}") # Log specific file
            df = self.reader.read_pm_data(file_path)
            
            if df is not None and not df.empty:
                meta_cols = ["date", "erbs id", "eutrancell id", "object", "cell id"]
                kpis = [c for c in df.columns if c.lower() not in meta_cols]
                log.info(f"   -> Detected {len(kpis)} KPIs in {file_path.name}")
                
                discovery_results.append({
                    "file_name": file_path.name,
                    "kpis": kpis
                })
        return discovery_results

    def get_targeted_kpi_values(self, file_name, kpi_name, target_cells):
        """MODE B: Fast extraction for specific Cell IDs."""
        log.info(f"Extracting '{kpi_name}' from {file_name} for {len(target_cells)} cells.")
        
        file_path = self.pm_dir / file_name
        df = self.reader.read_pm_data(file_path)
        
        if df is None: 
            log.error(f"Could not read file: {file_name}")
            return {}

        df.columns = df.columns.str.lower()
        cell_col = next((c for c in df.columns if "cell" in c), None)
        
        if not cell_col:
            log.error(f"Cell column not found in {file_name}")
            return {}

        mask = df[cell_col].astype(str).isin([str(c) for c in target_cells])
        result_df = df[mask]
        
        log.info(f"Successfully matched {len(result_df)} rows.")
        return result_df.set_index(cell_col)[kpi_name.lower()].to_dict()