import pandas as pd

# Load just the schema from your generated parquet
df = pd.read_parquet('samples/raw_20260202_145814_pm_NRCELLDU_HOURLY.parquet')

# 1. Verify the column exists
print(f"Columns in Parquet: {df.columns.tolist()}")

# 2. Verify the Data Type (Should be datetime64 or object-string ISO)
print(f"Date Column Type: {df['Date'].dtype}")

# 3. Peek at the first few values
print(df['Date'].head())