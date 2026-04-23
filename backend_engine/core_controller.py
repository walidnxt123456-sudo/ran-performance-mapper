# backend_engine/core_controller.py
from backend_engine.controllers.geo_service_controller import GeoServiceController
from backend_engine.controllers.pm_service_controller import PmServiceController
from backend_engine.utils.session_manager import SessionManager
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("CORE_CONTROLLER")

class RFController:
    """
    Main Orchestrator for the RF Mapping Application.
    Acts as the interface between the Frontend API and Backend Services.
    """
    def __init__(self):
        self.verbose = True
        # Initialize the Session Manager for multi-user context
        self.manager = SessionManager(timeout_minutes=30) 
        log.info("RF Controller linked to Session Manager.")
        
        # --- BEST PRACTICE: Initialize services once during startup ---
        # This makes the controller "Path Agnostic" as it uses default settings
        # or can be passed a custom CSV path if needed.
        self.geo_manager = GeoServiceController()
        
        self.pm_manager = PmServiceController()
        
        log.info("RF Controller initialized with GeoLocator Service.")

    def process_request(self, data: dict) -> dict:
        """
        New Main Entry Point: 
        Branches to Discovery or Extraction based on the 'mode' key.
        """
        
        # Default to discovery if 'mode' is missing or set to 'discovery'
        mode = data.get("mode", "discovery")
        
        if mode == "discovery":
            return self.process_site_discovery(data)
            
        elif mode == "extraction":
            # We call the PM manager directly for KPI values
            return self.pm_manager.fetch_kpi_layer(data)
            
        else:
            return {"success": False, "message": f"Unknown mode: {mode}"}
    
    def process_site_discovery(self, data: dict) -> dict:
        """
        Handles 'Apply Selection' requests from the frontend.
        Coordinates the discovery of the N nearest physical sites.
        
        Args:
            data (dict): Standardized Request JSON containing:
                - 'center': {'lat': float, 'lon': float}
                - 'technologies': list (e.g., ["4G", "5G"])
                - 'limit': int (number of sites to return)
        
        Returns:
            dict: Standardized Response JSON for the Frontend.
        """
        if self.verbose:
            self._log_inbound_request(data)

        try:
            # 1. Validation: Ensure required keys exist before processing
            if not data.get('center') or not data.get('technologies'):
                return {
                    "success": False, 
                    "message": "Missing required parameters: center or technologies."
                }
            
            # 2. Physical Site Discovery
            # We call the geo_manager to query the database/CSV for nearest sites
            service_response = self.geo_manager.handle_site_discovery(data)
            
            # 3. PM Asset Discovery (Mode A)
            # We scan the data folders to see what KPIs/Files are available
            pm_res = self.pm_manager.discover_pm_assets(data)
            pm_data = pm_res.get("data", []) if pm_res.get("status") == "success" else []
            
            
            # 4. Handle Response States
            status = service_response.get("status")
            sites = service_response.get("sites", [])
            
            if status == "success":
                if self.verbose:
                    log.info(f"Discovery successful: found {len(sites)} sites.")
                return {
                    "success": True,
                    "count": len(sites),
                    "sites": sites,
                    "pm_discovery": pm_data,  # This populates the sidebar tree
                    "message": "Discovery successful"
                }
            elif status == "empty":
                return {
                    "success": True,
                    "count": 0,
                    "sites": [],
                    "pm_discovery": pm_data, # Still show files even if no sites found
                    "message": "No sites found in this area."
                }
            else:
                return {
                    "success": False,
                    "message": service_response.get("message", "Unknown geo-service error.")
                }
        except Exception as e:
            log.error(f"Critical failure in process_site_discovery: {str(e)}")
            return {
                "success": False, 
                "message": f"Internal Controller Error: {str(e)}"
            }
                

    def _log_inbound_request(self, data: dict):
        """Helper for clean console debugging."""
        #print("\n" + " =️ " * 15)
        print("[CORE_CONTROLLER] INBOUND SITE DISCOVERY REQUEST")
        center = data.get('center', {})
        techs = data.get('technologies', [])
        print(f"   Target:    Lat {center.get('lat')}, Lon {center.get('lon')}")
        print(f"   Techs:     {', '.join(techs) if techs else 'None'}")
        print(f"   Limit:     {data.get('limit')}")
        #print(" =️ " * 15 + "\n")

    # --- Session Management Stubs (Existing Logic) ---
    def initialize_session(self, session_id):
        pass

    def get_map_elements(self, session_id):
        pass