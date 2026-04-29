#ran-performance-mapper\backend_engine\module\pm_file_discovery_module\discovery_main.py
import json
import sys
from pathlib import Path
from .models import InputDiscoveryConfig, InputExtractionConfig
from .file_adapter import FileAdapter
from .analytic_engine import AnalyticEngine
from backend_engine.infrastructure.csv_reader import CsvReader
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("PM_DISCOVERY_MODULE")

class DiscoveryModule:
    PM_KEYWORDS = ["Date", "ERBS Id", "EUtranCell Id", "Object", "DATE_ID", "NE Name", "HOUR", "HOUR_ID", "CELL", "CELL_ID", "CELLID"]

    def __init__(self, json_input: str):
        try:
            data = json.loads(json_input) if isinstance(json_input, str) else json_input
            mode = data.get("mode", "discovery")
            if mode == "discovery":
                self.config = InputDiscoveryConfig(**data)
            elif mode == "extraction":
                self.config = InputExtractionConfig(**data)
            else:
                log.info(f"PM_DISCOVERY_MODULE {json.dumps({"status": "error", "message": f"Unknown mode: {mode}"})}")
                
        except Exception as e:
            print(json.dumps({"status": "error", "message": f"Initialization Error: {e}"}))
            sys.exit(1)

        self.adapter = FileAdapter(self.config.file_path)
        self.engine = AnalyticEngine()

    def run_and_return(self) -> dict:
        if self.config.mode == "discovery":
            return self._handle_discovery()
        elif self.config.mode == "extraction":
            return self._handle_extraction()
        return {"status": "error", "message": f"Unknown mode: {self.config.mode}"}

    def run(self):
        result = self.run_and_return()
        print(json.dumps(result, indent=4))

    def _handle_discovery(self) -> dict:
        chunk = next(self.adapter.stream_csv_chunks(self.PM_KEYWORDS), None)
        if chunk is not None:
            res = self.engine.run_discovery_scan(chunk)
            return {"status": "success", "discovery": res}
        return {"status": "error", "message": "Failed to read file headers."}

    def _handle_extraction(self) -> dict:
        # 1. Define columns to load based on user configuration
        cols_to_load = [self.config.cell_identity_column, self.config.date_identity_column]
        
        kpi_cols = self.config.kpi_identity_column
        if isinstance(kpi_cols, str):
            kpi_cols = [kpi_cols]
            
        cols_to_load += kpi_cols
        
        if self.config.hour_identity_column:
            cols_to_load.append(self.config.hour_identity_column)
        
        # Clean the list (remove empty/None and duplicates)
        cols_to_load = list(dict.fromkeys(filter(None, cols_to_load)))
        log.info(f">>>PM_DISCOVERY_MODULE cols_to_load: {cols_to_load}")

        try:
            # 2. Use your infrastructure CsvReader to read the full PM data
            # This uses your logic for auto-detecting headers, separators, and encoding
            reader = CsvReader()
            base_dir = Path("data/pm/")
            pm_file_path = base_dir / self.config.file_path
            log.info(f">>>PM_DISCOVERY_MODULE Reading full file with CsvReader: {pm_file_path}")
            
            # read_pm_data handles decimal=',' and drops empty columns automatically
            
            df = reader.read_pm_data(Path(pm_file_path))

            if df is None or df.empty:
                return {"status": "error", "message": "File is empty or could not be read."}

            # 3. Filter to only needed columns that actually exist in the file
            available = [c for c in cols_to_load if c in df.columns]
            log.info(f">>>PM_DISCOVERY_MODULE available columns: {available}")
            
            # 4. Pass the filtered dataframe to the engine for math (Average or Busy Hour)
            self.engine.process_extraction(df[available], self.config)
            
            # 5. Return success and results to the UI
            engine_output = self.engine.get_results()
            return {
                "status": "success",
                "processed_kpis": engine_output["processed_kpis"],
                "processed_cells": engine_output["processed_cells"],
                "results": engine_output["results"],  # ← Flatten it
                "missing_cells": []  # Controller expects this
            }

        except Exception as e:
            log.info(f">>>PM_DISCOVERY_MODULE Extraction failed: {str(e)}")
            return {"status": "error", "message": f"Extraction failed: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        DiscoveryModule(sys.argv[1]).run()