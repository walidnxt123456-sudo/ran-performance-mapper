import datetime
import threading
import time
from backend_engine.utils.debug_logger import setup_logger

log = setup_logger("SESSION_MANAGER")

class SessionManager:
    def __init__(self, timeout_minutes=30):
        self._sessions = {}
        self._timeout = datetime.timedelta(minutes=timeout_minutes)
        self._lock = threading.Lock() # Ensures thread-safety during purge
        self._start_janitor()

    def _start_janitor(self):
        thread = threading.Thread(target=self._janitor_loop, daemon=True)
        thread.start()
        log.info("Janitor background thread active.")

    def _janitor_loop(self):
        while True:
            time.sleep(300) # Scan every 5 minutes
            self.purge()

    def get_session(self, session_id):
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session["last_active"] = datetime.datetime.now()
            return session

    def set_session(self, session_id, data_dict):
        with self._lock:
            data_dict["last_active"] = datetime.datetime.now()
            self._sessions[session_id] = data_dict
            log.info(f"Session stored: {session_id}")

    def purge(self):
        now = datetime.datetime.now()
        with self._lock:
            expired = [sid for sid, data in self._sessions.items() 
                       if now - data["last_active"] > self._timeout]
            for sid in expired:
                del self._sessions[sid]
                log.info(f"Janitor: Cleaned up {sid}")