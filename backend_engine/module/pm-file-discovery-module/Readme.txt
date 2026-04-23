Universal PM File Discovery Module. It is designed to be the high-performance "Data Gatekeeper" for RadioRCA and 5G Expert Engine projects.
________________________________________
1. The Logic of the Module
The module acts as a stateless transformer that converts massive, messy vendor PM files into "Analysis-Ready" JSON.
•	Dual-Phase Operation: * Discovery: A fast scout pass to identify what’s inside (Sites, Cells, Dates, Counters).
o	Extraction: A precision pass to pull specific data for targeted cells.
•	The "Busy Hour" (BH) Engine: It dynamically identifies the peak hour for every individual cell/site for every day based on a user-defined metric (e.g., Traffic or RRC Users).
•	Daily Integrity: It calculates 24-hour sums and averages. If data is missing for specific hours, it injects zeros to ensure the daily average accurately reflects network health and downtime.
•	Dimensional Folding: It understands the hierarchy of Region $\rightarrow$ Site $\rightarrow$ Cell, allowing it to "roll up" granular cell data into a unified site view automatically.
________________________________________
2. Techniques Used
To handle large-scale telco data on a single machine with limited RAM, the module employs "Big Data" strategies scaled down for local execution:
•	Hybrid Streaming-to-Columnar: * Streaming: Reading the raw CSV in small chunks to prevent memory crashes.
o	Columnar (Parquet): Converting the filtered data into Parquet format. This allows the script to read only the specific columns (KPIs) needed for math, skipping the rest of the file.
•	Lazy Loading: The module only processes the "Target List" provided by the user, ignoring irrelevant network data as early as possible in the pipeline.
•	Vectorized Math: Using libraries like Polars or Pandas to perform calculations on entire columns simultaneously rather than looping through rows, which is 100x faster.
•	Stateless JSON I/O: The module doesn't "save" its state; it receives instructions via JSON and outputs results via JSON, making it perfectly compatible with any frontend or secondary script.
________________________________________
3. Architecture
The module is built with a Four-Layer Separation of Concerns, ensuring that I/O logic never mixes with mathematical logic.
Layer 1: I/O & Format Adapter
•	Job: Handles raw file reading (CSV/XLSX) and writes/reads the Silver Layer (Parquet) cache.
•	Value: Abstracts the file type so the rest of the module doesn't care if the source is a comma-separated file or an Excel sheet.
Layer 2: Filter & Selection Service (The "Sieve")
•	Job: Filters rows based on the Target List (Sites/Cells) and performs "Sanitization" (converting "N/A" or Nulls to 0).
•	Value: Ensures the math engine only receives "clean" data.
Layer 3: Analytics & Aggregation Engine
•	Job: Tracks BH peaks per cell/day and accumulates daily totals. Handles the site-level "Roll-up."
•	Value: Contains the core business logic for RAN performance analysis.
Layer 4: Orchestrator & Interface
•	Job: The "Brain" that reads the input JSON, checks for existing caches, calls the other layers in order, and packages the final result.
•	Value: Provides a single, clean entry point for integration.
________________________________________
4. Roadmap to Implementation
The development follows a "Crawl-Walk-Run" approach to ensure stability at every step.
Phase 1: The "Minimal Viable Parser" (MVP)
•	Build the Orchestrator to read a basic JSON instruction.
•	Implement the FileAdapter for CSV streaming only.
•	Create a simple AnalyticEngine that can sum one KPI for one cell.
Phase 2: The "Dimensional" Logic
•	Implement the Discovery Mode to extract the list of Cells/Sites and Headers.
•	Add the Target Filtering logic (The Sieve).
•	Implement the Site Aggregation logic (mapping cells to sites).
Phase 3: The "Performance" Leap
•	Integrate PyArrow/Polars for the Parquet (Silver Layer) conversion.
•	Build the "Cache Check" logic: If Parquet exists, use it; otherwise, convert the CSV.
•	Fine-tune the "Chunk Size" to optimize speed vs. RAM usage on your machine.
Phase 4: The "Edge Case" Polish
•	Implement the Gap-Filler (injecting zeros for missing hours).
•	Add robust error handling (returning JSON errors for missing files or wrong headers).
•	Validate the output against a real vendor file to ensure the BH math is perfect.
