from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Union

@dataclass
class InputDiscoveryConfig:
    """
    Data structure for the JSON input Discovery instructions.
    """
    file_path: str
    mode: str = "discovery"

@dataclass
class OuputDiscoveryConfig:
    """
    Data structure for the JSON ouput Discovery result.
    """
    file_path: str
    mode: str = "discovery"
    column_list: List[str] = field(default_factory=list)
    cells_available: List[str] = field(default_factory=list)
    date_available: List[str] = field(default_factory=list)
    hour_column_found: Optional[str] = None  # Returns the name of the hour col if detected

@dataclass
class InputExtractionConfig:
    """
    Data structure for the JSON input extraction instructions.
    """
    file_path: str
    cell_identity_column: str         # The Cell ID column
    date_identity_column: str         # The Date column

    mode: str = "extraction"
    kpi_identity_column: Union[str, List[str]] = field(default_factory=list)
    hour_identity_column: Optional[str] = None
    extraction_mode: str = "avg" # "avg" / "bh"
    target_date: List[str] = field(default_factory=list)
    target_cells: List[str] = field(default_factory=list)

@dataclass
class OuputExtractionConfig:
    """
    Data structure for the JSON output extraction result.
    """
    file_path: str
    mode: str = "extraction"
    
    # Metadata for the UI to quickly identify what is inside the payload
    processed_kpis: List[str] = field(default_factory=list)
    processed_cells: List[str] = field(default_factory=list)
    
    # Primary Data Store
    # Structure: { "CellID": { "KPI_Name": { "value": float, "busy_hour": str } } }
    results: Dict[str, Dict[str, Dict[str, Any]]] = field(default_factory=dict)
    
    missing_cells: List[str] = field(default_factory=list)
    
    status: str = "success"
    errors: List[str] = field(default_factory=list)
    execution_time_ms: Optional[int] = None
