#backend_engine/api_schemas.py
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union

# --- FLOW 1: SITE DISCOVERY ---

@dataclass
class SiteDiscoveryRequest:
    """Frontend -> Backend: Request nearby sites and available PM metadata."""
    center: Dict[str, float]  # {"lat": 35.83, "lon": 10.61}
    technologies: List[str]   # ["4G", "5G"]
    limit: int = 10

@dataclass
class SectorInfo:
    """
    Represents a single cell's static configuration from the database.
    This includes all parameters needed for GIS mapping and technical identification.
    """
    cell: str                   # The unique Cell ID (e.g., "4G_Khzema_1")
    cgi: Optional[str] = None   # Cell Global Identity
    azimuth: Optional[int] = None
    beamwidth: Optional[int] = None
    height: Optional[float] = None
    mechanical_tilt: Optional[float] = None
    electrical_tilt: Optional[float] = None
    frequency_band: Optional[str] = None
    pci: Optional[int] = None   # Physical Cell ID (or RSI for 5G)
    
    # Allows for any additional vendor-specific parameters found in the DB
    additional_props: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SiteInfo:
    site_id: str
    technology: str
    lat: float
    lon: float
    sectors: List[SectorInfo]
    distance_km: Optional[float] = None

@dataclass
class PMFileMetadata:
    """Metadata discovered for a specific CSV/Parquet file."""
    file_name: str
    mode: str = "discovery"
    column_list: List[str] = field(default_factory=list)
    date_available: List[str] = field(default_factory=list)
    hour_column_found: Optional[str] = None  # Returns the name of the hour col if detected


@dataclass
class SiteDiscoveryResponse:
    """Backend -> Frontend: Map sites and file selection metadata."""
    success: bool
    sites: List[SiteInfo]
    pm_discovery: List[PMFileMetadata]
    count: int = 0

# --- FLOW 2: KPI EXTRACTION ---

@dataclass
class ExtractionTask:
    """A single file extraction instruction within ExtractionRequest."""
    file_path: str
    cell_identity_column: str
    date_identity_column: str
    target_kpi: List[str]
    target_date: List[str]
    target_cells: List[str]
    hour_identity_column: Optional[str] = None
    extraction_mode: str = "bh" # "bh" or "avg"

@dataclass
class ExtractionRequest:
    """Frontend -> Backend: Request KPIs from multiple files in one go."""
    mode: str = "extraction"
    tasks: List[ExtractionTask] = field(default_factory=list)

@dataclass
class KPIValue:
    """The final calculated data point for a specific Cell/KPI."""
    value: float
    date: str
    extraction_mode: str
    file_name: str
    busy_hour: Optional[str] = None # Only if mode is "bh"

@dataclass
class FileResult:
    """Grouped results and audit trail for a specific file."""
    metadata: Dict[str, Any] # Includes date, mode, missing_cells
    cells: Dict[str, Dict[str, KPIValue]] # { "Cell_ID": { "KPI_Name": KPIValue } }

@dataclass
class ExtractionResponse:
    """Backend -> Frontend: The final merged results for map visualization."""
    success: bool
    extraction_results: Dict[str, FileResult] # { "file_name": FileResult }
    metadata: Dict[str, Any] = field(default_factory=dict) # e.g., execution_time_ms