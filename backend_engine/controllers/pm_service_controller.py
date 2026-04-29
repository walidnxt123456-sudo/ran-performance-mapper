# backend_engine/controllers/pm_service_controller.py
import sys
import os
from backend_engine.module.pm_file_discovery_module.discovery_main import DiscoveryModule
import json
from backend_engine.services.pm_service import PmService
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("PM_CONTROLLER")

class PmServiceController:
    def __init__(self):
        # 1. Path to the advanced module (could be an environment variable)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.advanced_module_path = os.path.join(
            base_dir, 'backend_engine', 'module', 'pm_file_discovery_module', 'discovery_main.py'
        )
        # 2. Configurable PM data folder
        self.pm_data_folder = os.getenv('PM_DATA_FOLDER', 'data/pm/')
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
        log.info("discover_pm_assets")
        if self._is_advanced_available():
            log.info(">>> Relay to ADVANCED PM Discovery Module")
            # Ensure the payload has the mandatory 'mode' for the Discovery module
            log.info(data)
            payload = data if data else {}
            payload.setdefault("mode", "discovery")
            # Hardcoded search directory for Step 1
            pm_data_folder = self.pm_data_folder
            pm_discovery_results = []
            
            # 1. Check if the folder exists to avoid errors
            if not os.path.exists(pm_data_folder):
                log.error(f"Data folder not found: {pm_data_folder}")
                return {"status": "error", "message": "pm Data directory missing"}
            
            # 2. Get list of files (filtering for CSV or Parquet)
            files = [f for f in os.listdir(pm_data_folder) if f.endswith(('.csv'))]
            log.info(f"file: {files}")
            for filename in files:
                # Build payload for this specific file
                payload = {
                    "mode": "discovery",
                    "file_path": os.path.join(pm_data_folder, filename)
                }
                
                log.info(">>> Executing module for single path: {payload['file_path']}")
                log.info(payload['file_path'])
                
                # Call your subprocess module
                log.info(f"discovery module run: {filename}")
                pm_discovery_module_result = self._run_module(payload)
                log.info("<<<< discovery module result")
                log.info(pm_discovery_module_result)
                log.info(">>>>")
                
                
                if pm_discovery_module_result.get("status") == "success":
                    
                    discovery_data = pm_discovery_module_result.get("discovery", {})
                    log.info(discovery_data)
                    
                    # Mapping internal models.py to frontend api_schemas.py
                    asset_info = {
                        "file_name": filename,
                        "mode": "discovery",                        
                        "column_list": discovery_data.get("column_list", []),
                        "date_available": discovery_data.get("date_available", []),
                        "hour_column_found": discovery_data.get("hour_column_found")
                    }
                    pm_discovery_results.append(asset_info)
            
            log.info("discovery mode end finale result :")
            log.info("<<<<")
            log.info(pm_discovery_results)
            log.info(">>>>")
            return pm_discovery_results
            
            
            
        else:
            try:
                log.info(">>> Inbound Request: PM Asset Discovery (FallBack)")
                data = self.service.get_pm_metadata()
                log.info(f"<<< Discovery Complete. Files identified: {len(data)}")
                return {
                    "status": "success", 
                    "data": data
                }
                
            except Exception as e:
                log.error(f"!!! Critical Discovery Failure: {e}")
                return {"status": "error", "message": str(e), "data": []}
    
    def fetch_kpi_layer(self, data: dict) -> dict:
        """
        Orchestrates KPI Extraction for multiple files.
        Processes 'tasks' from a BatchExtractionRequest payload.
        """
        log.info("--- PM_CONTROLLER: Starting Batch Extraction ---")
        
        # 1. Access the tasks list from the BatchExtractionRequest
        tasks = data.get("tasks", [])
        results_by_file = {}

        if not tasks:
            log.warning("No tasks found in the extraction request.")
            return {"success": False, "message": "No extraction tasks provided."}

        for task in tasks:
            # Safety: Initialize variables for this specific task
            file_path = task.get('file_path')
            file_name = os.path.basename(file_path) if file_path else "unknown"
            formatted_cells = {}
            raw_result = {"status": "error", "missing_cells": []}

            log.info(f"Processing Task: {file_name}")

            # 2. Build internal payload (Mapping schemas)
            # Note: Mapping 'target_kpi' from frontend to 'kpi_identity_column' for module
            payload = {
                "mode": "extraction",
                "file_path": file_path,
                "cell_identity_column": task.get("cell_identity_column"),
                "date_identity_column": task.get("date_identity_column"),
                "hour_identity_column": task.get("hour_identity_column"),
                
                "kpi_identity_column": task.get("target_kpi") or task.get("kpi_identity_column"),
                "extraction_mode": task.get("extraction_mode", "bh"),
                "target_date": task.get("target_date", []),
                "target_cells": task.get("target_cells", [])
            }
            #log.info(payload)

            if self._is_advanced_available():
                log.info(f"Processing Task advanced_available: {payload}")
                try:
                    raw_result = self._run_module(payload)
                    log.info(f"Processing Task advanced_available raw_result:")
                    log.info(f"Processing Task advanced_available raw_result: {raw_result}")
                    
                    if raw_result.get("status") == "success":
                        internal_data = raw_result.get("results", {})
                        log.info(f"Processing Task advanced_available Success: {internal_data}")
                        
                        # 3. Format results to match KPIValue schema
                        for cell_id, kpis in internal_data.items():
                            formatted_cells[cell_id] = {}
                            for kpi_name, kpi_data in kpis.items():
                                formatted_cells[cell_id][kpi_name] = {
                                    "value": kpi_data.get("value"),
                                    "date": task["target_date"][0] if task.get("target_date") else "N/A",
                                    "extraction_mode": task.get("extraction_mode", "bh"),
                                    "file_name": file_name,
                                    "busy_hour": str(kpi_data.get("busy_hour")) if kpi_data.get("busy_hour") else None
                                }
                        # 4. Store results for this specific file matching FileResult schema
                        results_by_file[file_name] = {
                            "cells": formatted_cells,
                            "metadata": {
                                "found_cells_count": len(formatted_cells),
                                "missing_cells": raw_result.get("missing_cells", []),
                                "extraction_date": task["target_date"][0] if task.get("target_date") else "N/A"
                            }
                        }
                        log.info(f"Batch Extraction Finished. Processed {len(results_by_file)} files.")
                        
                except Exception as e:
                    log.error(f"Extraction failed for {file_name}: {str(e)}")

        # 5. Return matching ExtractionResponse schema
        return {
            "success": True,
            "results_by_file": results_by_file
        }