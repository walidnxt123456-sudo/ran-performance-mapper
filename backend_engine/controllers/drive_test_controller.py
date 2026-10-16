from backend_engine.services.drive_test_service import DriveTestService
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("DRIVE_TEST_CONTROLLER")

class DriveTestController:
    """
    Controller for Drive Test operations. Acts as an intermediary between
    API endpoints and the DriveTestService.
    """
    def __init__(self):
        self.service = DriveTestService()
        log.info("DriveTestController initialized.")

    def handle_scan(self) -> dict:
        """Scans and returns available drive test files and their metadata."""
        try:
            files_meta = self.service.scan_drive_test_files()
            return {
                "success": True,
                "count": len(files_meta),
                "drive_test_discovery": files_meta
            }
        except Exception as e:
            log.error(f"Error in handle_scan: {e}")
            return {"success": False, "message": str(e)}

    def handle_get_data(self, data: dict) -> dict:
        """Parses and returns specific drive test file records."""
        file_name = data.get("file_name")
        if not file_name:
            return {"success": False, "message": "Missing 'file_name' parameter."}
        
        try:
            return self.service.get_drive_test_data(file_name)
        except Exception as e:
            log.error(f"Error in handle_get_data: {e}")
            return {"success": False, "message": str(e)}