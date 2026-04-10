# backend_engine/controllers/pm_service_controller.py
from backend_engine.services.pm_service import PmService
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("PM_CONTROLLER")

class PmServiceController:
    def __init__(self):
        self.service = PmService()

    def discover_pm_assets(self):
        """Orchestrates Mode A: Discovery."""
        try:
            log.info(">>> Inbound Request: PM Asset Discovery (Mode A)")
            data = self.service.get_pm_metadata()
            log.info(f"<<< Discovery Complete. Files identified: {len(data)}")
            return {"status": "success", "data": data}
        except Exception as e:
            log.error(f"!!! Critical Discovery Failure: {e}")
            return {"status": "error", "message": str(e), "data": []}

    def fetch_kpi_layer(self, file_name, kpi_name, cell_list):
        """Orchestrates Mode B: Extraction."""
        try:
            log.info(f">>> Inbound Request: Extracting {kpi_name} from {file_name}")
            values = self.service.get_targeted_kpi_values(file_name, kpi_name, cell_list)
            log.info(f"<<< Extraction Complete. Values found: {len(values)}")
            return {"status": "success", "values": values}
        except Exception as e:
            log.error(f"!!! Critical Extraction Failure: {e}")
            return {"status": "error", "message": str(e)}