import time
import os
import sqlite3
import threading
from smbus2 import SMBus

# --- Battery Configuration ---
I2C_ADDRESS = 0x40
SHUNT_OHMS = 0.1 
BATTERY_CAPACITY_AH = 8.0 
STATE_FILE = "/home/ottowillborn/surf-cam/battery_state.txt"
DB_PATH = "/home/ottowillborn/surf-cam/battery_history.db"

class BatteryMonitor:
    def __init__(self, bus_num, addr):
        self.bus = SMBus(bus_num)
        self.addr = addr
        
        # Initialize Hardware
        cal_value = int(0.00512 / (0.001 * SHUNT_OHMS))
        self.write_reg(0x05, cal_value)
        
        # Load Prev State
        self.current_ah = self.load_state()
        self.last_time = time.time()

        # Initialize Database
        self._init_db()

        # Start Background Logger Thread
        self.logging_thread = threading.Thread(target=self._log_loop, daemon=True)
        self.logging_thread.start()

    def _init_db(self):
        """Creates database and enables WAL mode for SD card health."""
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("PRAGMA journal_mode=WAL;") 
            conn.execute('''CREATE TABLE IF NOT EXISTS battery_stats
                         (timestamp DATETIME DEFAULT (datetime('now','localtime')),
                          voltage REAL, current REAL, soc REAL)''')

    def _log_loop(self):
        """Background thread that logs to DB every 10 minutes."""
        while True:
            try:
                # Use get_update() to ensure Coulomb counting stays fresh
                v, i, soc = self.get_update()
                
                with sqlite3.connect(DB_PATH) as conn:
                    conn.execute(
                        "INSERT INTO battery_stats (voltage, current, soc) VALUES (?, ?, ?)",
                        (round(v, 2), round(i, 3), round(soc, 1))
                    )
                # Log snapshot once every 5 minutes
                time.sleep(300) 
            except Exception as e:
                print(f"Logging error: {e}")
                time.sleep(60)

    def write_reg(self, reg, value):
        bus_val = [(value >> 8) & 0xFF, value & 0xFF]
        self.bus.write_i2c_block_data(self.addr, reg, bus_val)

    def read_reg(self, reg):
        try:
            data = self.bus.read_i2c_block_data(self.addr, reg, 2)
            return (data[0] << 8) | data[1]
        except: return 0

    def load_state(self):
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                try: return float(f.read())
                except: return BATTERY_CAPACITY_AH
        return BATTERY_CAPACITY_AH

    def save_state(self):
        with open(STATE_FILE, "w") as f:
            f.write(str(self.current_ah))

    def get_update(self):
        # Read Hardware
        v_raw = self.read_reg(0x02)
        v = v_raw * 0.00125
        i_raw = self.read_reg(0x04)
        if i_raw > 32767: i_raw -= 65536
        i = i_raw * 0.001 # Amps

        # Coulomb Counting
        now = time.time()
        elapsed_hours = (now - self.last_time) / 3600.0
        self.last_time = now
        self.current_ah += (i * elapsed_hours)
        
        # Clamps & Calibration
        if self.current_ah > BATTERY_CAPACITY_AH: self.current_ah = BATTERY_CAPACITY_AH
        if self.current_ah < 0: self.current_ah = 0
        
        # Force 100% when battery is actually full (14.2V + low charge current)
        if v >= 14.2 and i > -0.05 and i < 0.1:
            self.current_ah = BATTERY_CAPACITY_AH
        
        soc = (self.current_ah / BATTERY_CAPACITY_AH) * 100
        return v, i, soc