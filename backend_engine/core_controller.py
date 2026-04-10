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

            # 2. Execution: Call the GeoLocator Service
            # The service handles the Haversine math and CSV grouping.
            #service_response = self.geo_locator.find_nearest_sites(data)
            try:
                print("self.geo_manager.handle_site_discovery(data)")
                print(data)
                ##################### Physical Site Discovery
                # 1. Forward the request to the Manager
                service_response = self.geo_manager.handle_site_discovery(data)
                is_success = service_response.get("status") == "success"
                print("is_success")
                print(is_success)
                # 2. Return standardized response
                final_response = {
                    "success": is_success,
                    "count": len(service_response.get("sites", [])),
                    "sites": service_response.get("sites", []),
                    "message": "Discovery successful" if is_success else "No data found"
                }
                
               # --- SEE THE OUTBOUND JSON ---
                if self.verbose:
                    import json
                    print("\n" + "🚀 " * 15)
                    print("[CORE_CONTROLLER] OUTBOUND JSON TO FRONTEND")
                    # indent=2 makes it readable in your terminal
                    print(json.dumps(service_response, indent=2))
                    print("🚀 " * 15 + "\n")
                # -----------------------------------------
                
                ############# PM Discovery (Discovery Mode)
                pm_res = self.pm_manager.discover_pm_assets()
            
            except Exception as e:
                log.error(f"Error during site discovery: {str(e)}")
                return {"success": False, "message": str(e)}
          
            # 3. Translation: Map Service output to a Controller Response
            if service_response.get("status") == "success":
                return {
                    "success": True,
                    "count": len(service_response.get("sites", [])),
                    "sites": service_response["sites"],
                    "pm_discovery": pm_res.get("data", []), # For PM sidebar
                    "message": "Discovery successful"
                }
            elif service_response.get("status") == "empty":
                return {
                    "success": True,
                    "count": 0,
                    "sites": [],
                    "message": "No sites found matching your criteria in the local database."
                }
            else:
                return {
                    "success": False,
                    "message": service_response.get("message", "Unknown service error.")
                }

        except Exception as e:
            log.error(f"Error during site discovery: {str(e)}")
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