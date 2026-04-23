import json
import sys
from models import InputDiscoveryConfig, InputExtractionConfig
from file_adapter import FileAdapter
from analytic_engine import AnalyticEngine

class DiscoveryModule:
    PM_KEYWORDS = ["Date", "ERBS Id", "EUtranCell Id", "Object", "DATE_ID", "NE Name", "HOUR", "HOUR_ID", "CELL", "CELL_ID", "CELLID"]

    def __init__(self, json_input: str):
        try:
            data = json.loads(json_input)
            mode = data.get("mode", "discovery")
            if mode == "discovery":
                self.config = InputDiscoveryConfig(**data)
            elif mode == "extraction":
                self.config = InputExtractionConfig(**data)
            else:
                print(json.dumps({"status": "error", "message": f"Unknown mode: {mode}"}))
                sys.exit(1)
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
        # Skip Silver Layer, stream directly from CSV
        cols_to_load = [self.config.cell_identity_column, self.config.date_identity_column]
        
        kpi_cols = self.config.kpi_identity_column
        if isinstance(kpi_cols, str):
            kpi_cols = [kpi_cols]
        cols_to_load += kpi_cols
        
        if self.config.hour_identity_column:
            cols_to_load.append(self.config.hour_identity_column)
        
        cols_to_load = list(dict.fromkeys(filter(None, cols_to_load)))

        try:
            for chunk in self.adapter.stream_csv_chunks(self.PM_KEYWORDS):
                # Filter to only needed columns
                available = [c for c in cols_to_load if c in chunk.columns]
                self.engine.process_extraction(chunk[available], self.config)
            return {"status": "success", "data": self.engine.get_results()}
        except Exception as e:
            return {"status": "error", "message": f"Extraction failed: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        DiscoveryModule(sys.argv[1]).run()