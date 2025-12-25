from flask import Flask, jsonify
import time
import subprocess
import os
import signal
import psutil
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # This enables CORS for all routes

start_time = time.time()
process = None  # Holds the camera process

def get_cpu_temp():
    # Reads the Pi's internal temperature sensor
    temp = os.popen("vcgencmd measure_temp").readline()
    return temp.replace("temp=", "").replace("'C\n", "")

@app.route('/stats', methods=['GET'])
def get_stats():
    uptime_seconds = int(time.time() - start_time)
    stats = {
        "temp": get_cpu_temp(),
        "cpu_usage": psutil.cpu_percent(),
        "memory": psutil.virtual_memory().percent,
        "uptime": f"{uptime_seconds // 3600}h {(uptime_seconds % 3600) // 60}m"
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
            'opi.tail5cc970.ts.net.crt', 
            'opi.tail5cc970.ts.net.key'
            )
    )