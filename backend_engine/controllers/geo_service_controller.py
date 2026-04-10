# backend_engine/controllers/geo_service_controller.py
from pathlib import Path
from backend_engine.services.geo_locator_nearest import GeoLocatorNearest
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("GEO_CONTROLLER")

class GeoServiceController:
    def __init__(self):
        self.locator = GeoLocatorNearest()
        self.data_path = Path("./data/cell_file/")
        log.info("GeoServiceController inti")

    def handle_site_discovery(self, request_data: dict) -> dict:
        """
        Coordinates multi-technology lookups by orchestrating the single-file service.
        """
        # Defensive programming: use .get() to avoid KeyError
        target_techs = request_data.get('technologies', [])
        limit = request_data.get('limit', 1)
        center = request_data.get('center')
        print("GeoServiceController")
        print(target_techs)
        
        all_results = []

        if not target_techs or not center:
            return {"status": "error", "message": "Missing technologies or center coordinates."}

        for tech in target_techs:
            # Look for a file matching the technology name (e.g., *4g*.csv)
            file_match = next(self.data_path.glob(f"*{tech.lower()}*.csv"), None)
            print(file_match)
            if file_match:
                # Prepare the specific instruction for the worker service
                sub_request = {
                    "center": center,
                    "file_path": str(file_match),
                    "technologies": target_techs,
                    "limit": limit
                }
                
                # Execute the single-file lookup
                service_response = self.locator.find_nearest_sites(sub_request)
                
                if service_response.get("status") == "success":
                    all_results.extend(service_response.get("sites", []))
            else:
                print(f"⚠️ [GEO_SERVICE_CTRL] No CSV found for technology: {tech}")

        if not all_results:
            return {"status": "empty", "sites": []}

        return {"status": "success", "sites": all_results}