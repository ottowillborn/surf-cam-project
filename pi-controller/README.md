# surf-cam backend

Raspberry Pi backend for a solar-powered surf camera. Streams live MJPEG video over HTTPS and exposes a REST API for system stats, battery telemetry, and stream control.

---

## Architecture

The backend runs as two independent Flask processes:

| Process | File | Port | Purpose |
|---|---|---|---|
| Controller | `controller.py` | 5001 | Stats, battery data, stream control |
| Camera server | `camera_server.py` | 5000 | MJPEG video stream |

The controller manages the camera server as a subprocess — it can start and stop it via API calls. This separation means the stream can be killed without taking down telemetry.

A third module, `battery_monitor.py`, runs as a background thread inside the controller process. It reads a INA219 power sensor over I2C and tracks battery state continuously.

```
                    ┌─────────────────────────────┐
                    │       controller.py          │
                    │           :5001              │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │   BatteryMonitor       │  │
                    │  │   (background thread)  │  │
                    │  │   INA219 over I2C      │  │
                    │  └────────────────────────┘  │
                    │                              │
                    │  subprocess.Popen ────────► camera_server.py
                    └─────────────────────────────┘             :5000
```

---

## Modules

### `battery_monitor.py`

Reads voltage and current from an INA219 sensor (I2C address `0x40`, shunt `0.1Ω`) and tracks state of charge using Coulomb counting.

- Calibrates the sensor on startup by writing to register `0x05`
- Loads the previous charge state from `battery_state.txt` on startup so reboots don't reset SOC
- Saves state on every `/stats` request and after clean shutdown
- Clamps SOC to `[0, 100]%` and force-sets 100% when voltage ≥ 14.2V with near-zero current (i.e. float charging)
- Logs a snapshot to SQLite every 5 minutes via a daemon thread
- Database uses WAL journal mode for SD card longevity

### `camera_server.py`

Serves a live MJPEG stream from a Picamera2-compatible camera.

| Route | Method | Description |
|---|---|---|
| `/` | GET | Browser-viewable HTML page with embedded stream |
| `/video_feed` | GET | Raw MJPEG stream (`multipart/x-mixed-replace`) |
| `/health` | GET | Returns `200 OK` — used by the controller to check liveness |

Captures frames as JPEG at ~20 FPS (`0.05s` sleep between frames). Runs with `threaded=True` which is required for MJPEG streaming to multiple clients.

---

### `controller.py`

Main API server. Manages the battery monitor and exposes system telemetry and stream control.

#### `GET /stats`

Returns a JSON snapshot of current system state:

```json
{
  "temp": "52.1",
  "cpu_usage": 23.4,
  "memory": 41.2,
  "uptime": "2h 14m",
  "battery": {
    "voltage": 12.84,
    "current": -0.312,
    "percentage": 76.5,
    "status": "Discharging"
  }
}
```

`status` is derived from current: `> 0.05A` → Charging, `< -0.05A` → Discharging, otherwise Idle.

Also calls `save_state()` on every request to keep the persisted SOC accurate.

#### `GET /history/day?date=YYYY-MM-DD`

Returns battery telemetry for a given day from the SQLite database. Defaults to today if no `date` parameter is provided.

```json
{
  "date": "2026-05-31",
  "count": 288,
  "data": [
    { "time": "08:00", "v": 12.6, "i": -0.3, "soc": 80.0 },
    ...
  ]
}
```

#### `POST /start`

Starts `camera_server.py` as a subprocess. No-ops if already running.

#### `POST /stop`

Sends `SIGINT` to the camera subprocess for a graceful shutdown. No-ops if not running.

---

## File Structure

```
surf-cam/
├── battery_monitor.py       # INA219 reader + Coulomb counter
├── camera_server.py         # MJPEG stream server (port 5000)
├── controller.py            # Telemetry + control API (port 5001)
├── battery_state.txt        # Persisted SOC (auto-created)
├── battery_history.db       # SQLite telemetry log (auto-created)
├── requirements.txt         # Pi production dependencies
├── requirements-test.txt    # CI / local test dependencies
├── pytest.ini               # Test config (pythonpath = .)
└── tests/
    ├── conftest.py
    ├── test_battery_monitor.py
    ├── test_camera_server.py
    └── test_controller.py
```