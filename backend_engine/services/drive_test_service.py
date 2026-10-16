import os
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from backend_engine.infrastructure.csv_reader import CsvReader
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("DRIVE_TEST_SERVICE")

class DriveTestService:
    """
    Service responsible for discovering, parsing, and analyzing Drive Test CSV files
    from the ./data/dt directory. Supports automated 3G, 4G, and 5G technology detection.
    """
    def __init__(self, data_dir: str = "./data/dt"):
        self.data_dir = Path(data_dir)
        self.csv_reader = CsvReader()
        log.info(f"DriveTestService initialized with directory: {self.data_dir}")

    def scan_drive_test_files(self) -> List[Dict[str, Any]]:
        """Scans the ./data/dt directory and returns metadata + detected technology for each CSV."""
        if not self.data_dir.exists():
            log.warning(f"Directory {self.data_dir} does not exist yet.")
            return []

        files_meta = []
        for file_path in self.data_dir.glob("*.csv"):
            try:
                # Read using existing robust reader
                df = self.csv_reader.read_rf_data(file_path)
                if df is None or df.empty:
                    continue

                tech = self._detect_technology(file_path, df)
                valid_points = 0
                if 'Latitude' in df.columns and 'Longitude' in df.columns:
                    valid_points = int(df[['Latitude', 'Longitude']].dropna().shape[0])

                files_meta.append({
                    "file_name": file_path.name,
                    "detected_technology": tech,
                    "total_rows": len(df),
                    "valid_gps_points": valid_points,
                    "columns": list(df.columns)
                })
            except Exception as e:
                log.error(f"Error scanning file {file_path.name}: {e}")

        return files_meta

    def _detect_technology(self, file_path: Path, df: pd.DataFrame) -> str:
        """Detects technology based on filename and column signatures."""
        fname = file_path.name.lower()
        cols_lower = [c.lower() for c in df.columns]

        # 1. Filename hints
        if "5g" in fname or "nr" in fname:
            return "5G"
        if "4g" in fname or "lte" in fname:
            return "4G"
        if "3g" in fname or "umts" in fname:
            return "3G"

        # 2. Column signature hints
        if any("nr spcell" in c for c in cols_lower):
            return "5G"
        if any("lte pcell" in c for c in cols_lower) or any("rsrp" in c for c in cols_lower):
            return "4G"
        if any("rscp" in c for c in cols_lower) or any("scrambling code" in c for c in cols_lower):
            return "3G"

        return "UNKNOWN"

    def get_drive_test_data(self, file_name: str) -> Dict[str, Any]:
        """Loads and parses specific Drive Test file data for frontend mapping."""
        file_path = self.data_dir / file_name
        if not file_path.exists():
            return {"success": False, "message": f"File {file_name} not found."}

        df = self.csv_reader.read_rf_data(file_path)
        if df is None:
            return {"success": False, "message": f"Failed to parse {file_name}."}

        tech = self._detect_technology(file_path, df)
        
        # Clean dataframe and retain valid GPS rows
        if 'Latitude' in df.columns and 'Longitude' in df.columns:
            df_clean = df.dropna(subset=['Latitude', 'Longitude']).copy()
        else:
            df_clean = df.copy()

        # Convert records to JSON-friendly dict list (limiting to avoid payload overload if needed)
        records = df_clean.fillna("").to_dict(orient="records")

        return {
            "success": True,
            "file_name": file_name,
            "detected_technology": tech,
            "count": len(records),
            "data": records
        }