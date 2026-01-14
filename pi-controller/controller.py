from flask import Flask, jsonify, request
import time
import subprocess
import os
import signal
import psutil
from flask_cors import CORS
from battery_monitor import BatteryMonitor, I2C_ADDRESS
import sqlite3

DB_PATH = "/home/ottowillborn/surf-cam/battery_history.db"
app = Flask(__name__)
CORS(app) # This enables CORS for all routes

# Initialize Battery Monitor
battery_monitor = BatteryMonitor(1, I2C_ADDRESS)
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
    volts, amps, soc = battery_monitor.get_update()
    battery_monitor.save_state() # Save on every request to keep it accurate

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

@app.route('/history/day', methods=['GET'])
def get_daily_history():
    # Get the date from the query string (e.g., /history/day?date=2026-01-14)
    # Default to 'now' if no date is provided
    target_date = request.args.get('date', time.strftime("%Y-%m-%d"))

    try:
        with sqlite3.connect(DB_PATH) as conn:
            # We use a query that filters by the specific date
            # and returns data points for that 24-hour window
            query = """
                SELECT strftime('%H:%M', timestamp) as time, 
                       voltage, current, soc
                FROM battery_stats 
                WHERE date(timestamp) = date(?)
                ORDER BY timestamp ASC
            """
            cursor = conn.execute(query, (target_date,))
            rows = cursor.fetchall()

        # Format the data for the frontend chart
        history_data = [
            {"time": r[0], "v": r[1], "i": r[2], "soc": r[3]} 
            for r in rows
        ]

        return jsonify({
            "date": target_date,
            "data": history_data,
            "count": len(history_data)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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