# main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend_engine.core_controller import RFController # Import the Brain
import sys
import io

# Force UTF-8 encoding for stdout and stderr
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
app = FastAPI()
rf_brain = RFController() # Initialize the Brain

app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/", response_class=FileResponse)
async def read_root():
    return "frontend/index.html"

# This is our specific endpoint for Site Discovery
"""
    Data structure for the JSON input instructions:
    
    mode: str = "discovery"  # "discovery" / "extraction"
    center: lon, lat
    technology: 4g/5g
    limit: int

"""
# This will use the default "discovery" mode
@app.post("/api/find-nearest")
async def find_nearest(data: dict):
    # Pass the JSON directly to the controller for logging
    print(data)
    return rf_brain.process_request(data)


# This is our specific endpoint for kpi fetch
"""
fetch_kpi
"""    
@app.post('/api/fetch-kpi')  # Correct FastAPI syntax
async def fetch_kpi(data: dict):
    # Ensure this JSON has "mode": "extraction"
    # (Or hardcode it here before passing to the brain)
    data["mode"] = "extraction"
    print(f"[API] Mode B Request: {data.get('kpi_name')} from {data.get('file_name')}")
    return rf_brain.process_request(data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)