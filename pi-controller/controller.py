from flask import Flask, jsonify
import time
import subprocess
import os
import signal
import psutil
from flask_cors import CORS
from smbus2 import SMBus

app = Flask(__name__)
CORS(app) # This enables CORS for all routes

# --- Battery Configuration ---
I2C_ADDRESS = 0x40
SHUNT_OHMS = 0.1 
BATTERY_CAPACITY_AH = 8.0 
STATE_FILE = "/home/ottowillborn/surf-cam/battery_state.txt"

class FuelGauge:
    def __init__(self, bus_num, addr):
        self.bus = SMBus(bus_num)
        self.addr = addr
        cal_value = int(0.00512 / (0.001 * SHUNT_OHMS))
        self.write_reg(0x05, cal_value)
        self.current_ah = self.load_state()
        self.last_time = time.time()

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
                return float(f.read())
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
        if v >= 14.2 and abs(i) < 0.1: self.current_ah = BATTERY_CAPACITY_AH
        
        soc = (self.current_ah / BATTERY_CAPACITY_AH) * 100
        return v, i, soc

# Initialize Gauge
gauge = FuelGauge(1, I2C_ADDRESS)
start_time = time.time()
process = None

def get_cpu_temp():
    # Reads the Pi's internal temperature sensor
    temp = os.popen("vcgencmd measure_temp").readline()
    return temp.replace("temp=", "").replace("'C\n", "")

@app.route('/stats', methods=['GET'])
def get_stats():
    uptime_seconds = int(time.time() - start_time)
    
    # Get latest battery data
    volts, amps, soc = gauge.get_update()
    gauge.save_state() # Save on every request to keep it accurate

    stats = {
        "temp": get_cpu_temp(),
        "cpu_usage": psutil.cpu_percent(),
        "memory": psutil.virtual_memory().percent,
        "uptime": f"{uptime_seconds // 3600}h {(uptime_seconds % 3600) // 60}m",
        "battery": {
            "voltage": round(volts, 2),
            "current": round(amps, 3),
            "percentage": round(soc, 1),
            "status": "Charging" if amps > 0.05 else "Discharging" if amps < -0.05 else "Idle"
        }
    }
    return jsonify(stats), 200

@app.route('/start', methods=['POST'])
def start_stream():
    global process
    if process is None or process.poll() is not None:
        # Start the camera script as a separate process
        process = subprocess.Popen(["/home/ottowillborn/surf-cam/.venv/bin/python3", "/home/ottowillborn/surf-cam/camera_server.py"])
        return "Stream started", 200
    return "Stream already running", 200

@app.route('/stop', methods=['POST'])
def stop_stream():
    global process
    if process and process.poll() is None:
        process.send_signal(signal.SIGINT) # Graceful Ctrl+C
        process = None
        return "Stream stopped", 200
    return "Stream not running", 200

if __name__ == '__main__':
    app.run(
        host='0.0.0.0', 
        port=5001, 
        threaded=True,
        ssl_context=(
            'opi-1.tail5cc970.ts.net.crt', 
            'opi-1.tail5cc970.ts.net.key'
            )
    )