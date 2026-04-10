# backend_engine/utils/debug_logger.py
import logging
import sys

def setup_logger(name):
    """Configures a logger that outputs to both the console and a file."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Format: Time - Module - Level - Message
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )

    # Console Handler (To see it in your MINGW64 terminal)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File Handler (To keep a history of errors)
    file_handler = logging.FileHandler('rf_app_debug.log')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger