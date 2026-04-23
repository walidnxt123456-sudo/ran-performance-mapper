from main import DiscoveryModule
import json

# TEST 1: DISCOVERY MODE
# Purpose: To see if the adaptive logic finds the headers and cells correctly.
discovery_json = """
{
    "file_path": "samples/lte ul rssi.csv",
    "mode": "discovery"
}
"""

print("--- TESTING DISCOVERY MODE ---")
discovery_tool = DiscoveryModule(discovery_json)
discovery_tool.run()

print("\\n" + "="*30 + "\\n")

# TEST 2: EXTRACTION MODE
# Purpose: To calculate Busy Hour and Totals for a specific KPI.
extraction_json = """
{
    "file_path": "samples/lte ul rssi.csv",
    "mode": "extraction",
    "kpi_identity_column": "UL RSSI",
    "cell_identity_column": "EUtranCell Id",
    "date_identity_column": "Date",
    "hour_identity_column":"Hour",
    "extraction_mode": "bh",
    "target_date": "01/04/2026",
    "target_cells": ["LSO033O","LSO033P","LSO033Q", "LSO033A","LSO033B","LSO033C"]
}
"""

print("--- TESTING EXTRACTION MODE ---")
extraction_tool = DiscoveryModule(extraction_json)
extraction_tool.run()