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
        Main Entry Point: 
        Branches to Discovery or Extraction based on the 'mode' key.
        """
        
        # Default to discovery if 'mode' is missing or set to 'discovery'
        mode = data.get("mode", "discovery")
        
        if mode == "discovery":
            return self.process_site_discovery(data)
            
        elif mode in ["extraction", "extraction_batch"]:
            # Direct relay to PM manager for batch processing
            log.info(f">>> Routing to PM Batch Extraction (Mode: {mode})")
            log.info(data)
            return self.pm_manager.fetch_kpi_layer(data)
            
        else:
            log.error(f"Unknown Request Mode: {mode}")
            return {"success": False, "message": f"Unknown mode: {mode}"}
    
    def process_site_discovery(self, data: dict) -> dict:
        """
        Flow 1: Coordinates Site Discovery and PM File Scanning.
        """
        if self.verbose:
            self._log_inbound_request(data)

        try:
            # 1. Parameter Validation
            if not data.get('center') or not data.get('technologies'):
                return {
                    "success": False, 
                    "message": "Missing required parameters: center or technologies."
                }
            
            # 2. Physical Site Discovery
            # We call the geo_manager to query the database/CSV for nearest sites
            geo_service_response = self.geo_manager.handle_site_discovery(data)
            
            # 3. Scan PM File Assets (PM-Service)
            # Alignment: pm_manager now returns 'pm_discovery' as the list key
            pm_service_controller_response = self.pm_manager.discover_pm_assets(data)
            log.info(">>>Core Controller - pm_service_controller_response:")
            log.info(pm_service_controller_response)
            
            # 4. Handle Response States
            # The pm_data is now injected into the final successful response
            geo_status = geo_service_response.get("status")
            sites = geo_service_response.get("sites", [])
            
            if geo_status in ["success", "empty"]:
                # Even if no sites are found (empty), we still consider the request a success
                # so the frontend can display the PM files found in the area
                msg = "Discovery successful" if geo_status == "success" else "No sites found in this area."
                
                SiteDiscoveryResponse = {
                    "success": True,
                    "count": len(sites),
                    "sites": sites,
                    "pm_discovery": pm_service_controller_response,  # From Step 2
                    "message": msg
                }
                log.info(">>>Core Controller - Discovery response to FrontEND")
                log.info(SiteDiscoveryResponse)
                return SiteDiscoveryResponse
                
            else:
                # Handle explicit errors from the GeoService
                return {
                    "success": False,
                    "message": geo_service_response.get("message", "Unknown geo-service error.")
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