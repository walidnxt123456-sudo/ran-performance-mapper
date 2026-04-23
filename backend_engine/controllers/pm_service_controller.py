# backend_engine/controllers/pm_service_controller.py
import sys
import os
_module_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'module', 'pm-file-discovery-module')
sys.path.insert(0, os.path.normpath(_module_path))
from discovery_main import DiscoveryModule  # ← renamed
sys.path.pop(0)
import json
from backend_engine.services.pm_service import PmService
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("PM_CONTROLLER")

class PmServiceController:
    def __init__(self):
        # 1. Path to the advanced module (could be an environment variable)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.advanced_module_path = os.path.join(
            base_dir, 'backend_engine', 'module', 'pm-file-discovery-module', 'discovery_main.py'
        )
        # 2. Local fallback service
        self.service = PmService()

    def _is_advanced_available(self) -> bool:
        """Checks if the advanced discovery module exists on the system."""
        return os.path.exists(self.advanced_module_path)

    def _run_module(self, payload: dict) -> dict:
        try:
            module = DiscoveryModule(json.dumps(payload))
            return module.run_and_return()  # ← see below
        except Exception as e:
            return {"status": "error", "message": str(e)}
        
    def discover_pm_assets(self, data: dict = None):
        """Orchestrates Mode A: Discovery with Hybrid Switch.
        Relays the raw JSON 'data' to the advanced module.
        """
        print("discover_pm_assets")
        if self._is_advanced_available():
            log.info(">>> Relay to ADVANCED PM Discovery Module")
            # Ensure the payload has the mandatory 'mode' for the Discovery module
            print(data)
            payload = data if data else {}
            payload["mode"] = "discovery"
            # Hardcoded search directory for Step 1
            pm_data_folder ="data/pm/"
            pm_discovery_results = []
            
            # 1. Check if the folder exists to avoid errors
            if not os.path.exists(pm_data_folder):
                log.error(f"Data folder not found: {pm_data_folder}")
                return {"status": "error", "message": "pm Data directory missing"}
            
            # 2. Get list of files (filtering for CSV or Parquet)
            files = [f for f in os.listdir(pm_data_folder) if f.endswith(('.csv'))]
            print(f"file: {files}")
            for filename in files:
                # Create a fresh payload for each file call
                payload = {
                    "mode": "discovery",
                    "file_path": os.path.join(pm_data_folder, filename)
                }
                
                log.info(f">>> Executing module for single path: {payload['file_path']}")
                
                # Call your subprocess module
                result = self._run_module(payload)
                print(f"discovery mode result:\n {result}")
                discovery_data = result.get("discovery", {})
                columns = discovery_data.get("columns", [])
                available_dates = discovery_data.get("available_dates", [])
                
                if result.get("status") == "success" and columns:
                    result["file_name"] = filename
                    # Extend the list with the KPIs found in this specific file
                    print(result)
                    file_entry = {
                        "file_name": filename,
                        "kpis": columns,
                        "date_available":available_dates,
                        "all_columns": discovery_data.get("columns", []),
                        "detected_date_col": discovery_data.get("detected_date_column", None),
                    }
                    pm_discovery_results.append(file_entry)
                    print(pm_discovery_results)
                print(f"discovery mode pm_discovery_results:\n {pm_discovery_results}")
                
            return {"status": "success", "data": pm_discovery_results}
            
            
            
        else:
            try:
                log.info(">>> Inbound Request: PM Asset Discovery (Mode A)")
                data = self.service.get_pm_metadata()
                log.info(f"<<< Discovery Complete. Files identified: {len(data)}")
                return {"status": "success", "data": data}
            except Exception as e:
                log.error(f"!!! Critical Discovery Failure: {e}")
                return {"status": "error", "message": str(e), "data": []}
    
    def _call_advanced_module(self, payload: dict):
        """Executes the external module passing ONLY the JSON."""
        print("_call_advanced_module")
        try:
            # Convert the dict to a pure JSON string
            json_input = json.dumps(payload)
            print(json_input)
            # Call the module: python main.py '{"json": "data"}'
            result = subprocess.run(
                [sys.executable, self.advanced_module_path, json_input],
                capture_output=True, 
                text=True
            )
            print("subprocess.run")
            print(result)
            #print(f"subprocess result: {result}")
            if result.returncode == 0:
                return json.loads(result.stdout)
                
            return {
                "status": "error", 
                "message": result.stderr
            }
            
        except Exception as e:
            print(f"[_call_advanced_module] Error: {e}")
            return {"status": "error", "message": str(e)}
    
    def fetch_kpi_layer(self, data: dict):
        """Orchestrates Mode B: Extraction.
        Relays the raw JSON 'data' directly.
        """
        kpi_selection = data.get("kpi_selection", [])
        cell_list = data.get("cells", [])
        target_date = data.get("target_date", [])
        extraction_mode = data.get("extraction_mode", "avg")
        cell_col = data.get("cell_identity_column")
        date_col = data.get("date_identity_column")
        hour_col = data.get("hour_identity_column")
        file_name = data.get("file_name")
        
        log.info(f"[API] Mode B Request: {kpi_selection} cells: {cell_list}")
        print(f"[DEBUG] advanced_module_path: {self.advanced_module_path}")
        print(f"[DEBUG] path exists: {os.path.exists(self.advanced_module_path)}")
        
        if self._is_advanced_available():
            log.info(">>> Relay to ADVANCED PM Extraction Module")
            
            all_results = {}
            for sel in kpi_selection:
                payload = {
                    "mode": "extraction",
                    "file_path": f"data/pm/{sel['file']}",
                    "kpi_identity_column": sel["kpi"],
                    "cell_identity_column": cell_col,
                    "date_identity_column": date_col,
                    "extraction_mode": extraction_mode,
                    "target_date": target_date,
                    "target_cells": cell_list
                }
                if hour_col:
                    payload["hour_identity_column"] = hour_col  # only add if present
                    
                result = self._run_module(payload)
                print(result)
                if result.get("status") == "success":
                    all_results[sel["kpi"]] = result.get("data", {})

            return {"status": "success", "success": True, "values": all_results}
    
        else:
            try:
                log.info(f">>> Inbound Request: Extracting {kpi_selection} from {file_name}")
                values = self.service.get_targeted_kpi_values(file_name, kpi_selection, cell_list)
                log.info(f"<<< Extraction Complete. Values found: {len(values)}")
                return {"status": "success", "values": values}
            except Exception as e:
                log.error(f"!!! Critical Extraction Failure: {e}")
                return {"status": "error", "message": str(e)}
            
