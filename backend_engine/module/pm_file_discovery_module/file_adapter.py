import pandas as pd
import csv
from pathlib import Path
from typing import Generator, Tuple, Optional

class FileAdapter:
    """
    Layer 1: I/O Adapter.
    Handles adaptive CSV streaming and high-speed Parquet (Silver Layer) caching.
    """
    def __init__(self, file_path: str, chunk_size: int = 100000):
        self.file_path = Path(file_path)
        self.chunk_size = chunk_size
        # The Silver Layer cache path
        self.cache_path = self.file_path.with_suffix('.parquet')

    def _detect_params(self, keywords: list) -> Tuple[int, str, str]:
        """
        Probes raw file to detect header start, separator, and encoding.
        """
        for enc in ['utf-16', 'utf-8', 'latin-1']:
            try:
                with open(self.file_path, 'r', encoding=enc) as f:
                    if not f.read(1024): continue
                    f.seek(0)
                    for i, line in enumerate(f):
                        if any(k in line for k in keywords):
                            sep = '\t' if '\t' in line else None
                            if not sep:
                                try: sep = csv.Sniffer().sniff(line).delimiter
                                except: sep = ';' if ';' in line else ','
                            return i, sep, enc
            except: continue
        return 0, ';', 'utf-8'

    def _fix_excel_dates(self, series: pd.Series) -> pd.Series:
        """
        Converts Excel serial dates (e.g., 45992) into ISO date strings.
        """
        # Try to convert numeric strings to numbers first
        numeric_dates = pd.to_numeric(series, errors='coerce')
        # Convert Excel serial to Datetime (Excel origin is 1899-12-30)
        return pd.to_datetime(numeric_dates, unit='D', origin='1899-12-30').dt.strftime('%Y-%m-%d')

    def create_silver_layer(self, keywords: list):
        """
        Reads CSV, normalizes data, and saves as Parquet for future fast access.
        """
        print(f" Creating Silver Layer: {self.cache_path.name}")
        skip, sep, enc = self._detect_params(keywords)
        
        # Read full file for conversion (Chunking can be used here if file > RAM)
        df = pd.read_csv(
            self.file_path, sep=sep, skiprows=skip, encoding=enc, 
            decimal=',', on_bad_lines='skip', engine='python'
        )
        
        df.columns = df.columns.str.strip()
        df.to_parquet(self.cache_path, index=False, engine='pyarrow')
        print(f" Silver Layer created with raw headers: {df.columns.tolist()[:5]}...")
        print(f" Silver Layer ready.")

    def stream_parquet(self, columns: list) -> Generator[pd.DataFrame, None, None]:
        """Reads only the necessary columns from the cache."""
        df = pd.read_parquet(self.cache_path, columns=columns)
        yield df

    def stream_csv_chunks(self, keywords: list) -> Generator[pd.DataFrame, None, None]:
        """Standard CSV streamer for Discovery mode."""
        skip, sep, enc = self._detect_params(keywords)
        reader = pd.read_csv(
            self.file_path, sep=sep, skiprows=skip, encoding=enc,
            chunksize=self.chunk_size, decimal=',', engine='python'
        )
        for chunk in reader:
            chunk.columns = chunk.columns.str.strip()
            yield chunk