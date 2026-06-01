"""
test_controller.py - Unit tests for controller Flask routes.

smbus2 and picamera2 are already mocked in conftest.py.
BatteryMonitor is patched so no real I2C hardware is touched.
"""
import json
import sys
import time
import pytest
from unittest.mock import patch, MagicMock

# Ensure a clean import every time this module is collected
sys.modules.pop("controller", None)
sys.modules.pop("battery_monitor", None)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    """
    Patch BatteryMonitor and system calls, then return a Flask test client.
    Module-scoped so the controller app is only initialised once.
    """
    mock_monitor = MagicMock()
    mock_monitor.get_update.return_value = (12.6, -0.5, 75.0)

    # Must pop here too in case a previous run cached them
    sys.modules.pop("controller", None)
    sys.modules.pop("battery_monitor", None)

    with (
        patch("sqlite3.connect"),
        patch("smbus2.SMBus"),
        patch("battery_monitor.BatteryMonitor", return_value=mock_monitor),
        patch("os.popen") as mock_popen,
        patch("psutil.cpu_percent", return_value=30.0),
        patch("psutil.virtual_memory") as mock_mem,
    ):
        mock_popen.return_value.readline.return_value = "temp=52.1'C\n"
        mock_mem.return_value.percent = 45.0

        import controller
        # Point the already-imported module's reference to our mock
        controller.battery_monitor = mock_monitor
        controller.app.config["TESTING"] = True
        with controller.app.test_client() as c:
            yield c


@pytest.fixture(scope="module")
def mock_monitor(client):
    """Return the already-constructed mock BatteryMonitor from the module."""
    import controller
    return controller.battery_monitor


# ---------------------------------------------------------------------------
# /stats
# ---------------------------------------------------------------------------

class TestStatsEndpoint:
    def test_returns_200(self, client):
        resp = client.get("/stats")
        assert resp.status_code == 200

    def test_response_is_json(self, client):
        resp = client.get("/stats")
        assert resp.content_type == "application/json"

    def test_battery_fields_present(self, client):
        data = json.loads(client.get("/stats").data)
        assert "battery" in data
        battery = data["battery"]
        for field in ("voltage", "current", "percentage", "status"):
            assert field in battery, f"Missing battery field: {field}"

    def test_system_fields_present(self, client):
        data = json.loads(client.get("/stats").data)
        for field in ("temp", "cpu_usage", "memory", "uptime"):
            assert field in data, f"Missing field: {field}"

    def test_battery_values_match_mock(self, client):
        data = json.loads(client.get("/stats").data)
        b = data["battery"]
        assert b["voltage"] == 12.6
        assert b["current"] == -0.5
        assert b["percentage"] == 75.0

    def test_discharging_status_when_current_negative(self, client):
        data = json.loads(client.get("/stats").data)
        assert data["battery"]["status"] == "Discharging"

    def test_charging_status_when_current_positive(self, client):
        import controller
        controller.battery_monitor.get_update.return_value = (13.5, 0.8, 80.0)
        data = json.loads(client.get("/stats").data)
        assert data["battery"]["status"] == "Charging"
        # Reset
        controller.battery_monitor.get_update.return_value = (12.6, -0.5, 75.0)

    def test_idle_status_when_current_near_zero(self, client):
        import controller
        controller.battery_monitor.get_update.return_value = (12.6, 0.0, 75.0)
        data = json.loads(client.get("/stats").data)
        assert data["battery"]["status"] == "Idle"
        # Reset
        controller.battery_monitor.get_update.return_value = (12.6, -0.5, 75.0)

    def test_uptime_format(self, client):
        data = json.loads(client.get("/stats").data)
        uptime = data["uptime"]
        assert "h" in uptime and "m" in uptime


# ---------------------------------------------------------------------------
# /history/day
# ---------------------------------------------------------------------------

class TestHistoryEndpoint:
    def _mock_db_rows(self):
        return [
            ("08:00", 12.5, -0.3, 80.0),
            ("08:05", 12.4, -0.4, 79.5),
        ]

    def test_returns_200_with_valid_date(self, client):
        with patch("controller.sqlite3.connect") as mock_conn:
            mock_conn.return_value.__enter__.return_value.execute.return_value.fetchall.return_value = self._mock_db_rows()
            resp = client.get("/history/day?date=2026-01-14")
        assert resp.status_code == 200

    def test_response_shape(self, client):
        with patch("controller.sqlite3.connect") as mock_conn:
            mock_conn.return_value.__enter__.return_value.execute.return_value.fetchall.return_value = self._mock_db_rows()
            data = json.loads(client.get("/history/day?date=2026-01-14").data)
        assert "date" in data
        assert "data" in data
        assert "count" in data
        assert data["count"] == len(self._mock_db_rows())

    def test_data_point_fields(self, client):
        with patch("controller.sqlite3.connect") as mock_conn:
            mock_conn.return_value.__enter__.return_value.execute.return_value.fetchall.return_value = self._mock_db_rows()
            data = json.loads(client.get("/history/day?date=2026-01-14").data)
        point = data["data"][0]
        for key in ("time", "v", "i", "soc"):
            assert key in point, f"Missing key: {key}"

    def test_defaults_to_today_when_no_date_param(self, client):
        today = time.strftime("%Y-%m-%d")
        with patch("controller.sqlite3.connect") as mock_conn:
            mock_conn.return_value.__enter__.return_value.execute.return_value.fetchall.return_value = []
            data = json.loads(client.get("/history/day").data)
        assert data["date"] == today

    def test_returns_500_on_db_error(self, client):
        with patch("controller.sqlite3.connect", side_effect=Exception("DB error")):
            resp = client.get("/history/day?date=2026-01-14")
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# /start and /stop
# ---------------------------------------------------------------------------

class TestStreamControl:
    def test_start_launches_process(self, client):
        import controller
        controller.process = None
        with patch("controller.subprocess.Popen") as mock_popen:
            mock_popen.return_value.poll.return_value = None
            resp = client.post("/start")
        assert resp.status_code == 200
        mock_popen.assert_called_once()

    def test_start_does_not_relaunch_running_process(self, client):
        import controller
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None  # still running
        controller.process = mock_proc
        with patch("controller.subprocess.Popen") as mock_popen:
            resp = client.post("/start")
        assert resp.status_code == 200
        mock_popen.assert_not_called()
        controller.process = None  # reset

    def test_stop_sends_sigint(self, client):
        import controller, signal
        mock_proc = MagicMock()
        mock_proc.poll.return_value = None  # running
        controller.process = mock_proc
        resp = client.post("/stop")
        assert resp.status_code == 200
        mock_proc.send_signal.assert_called_once_with(signal.SIGINT)
        assert controller.process is None

    def test_stop_when_not_running(self, client):
        import controller
        controller.process = None
        resp = client.post("/stop")
        assert resp.status_code == 200
        assert b"not running" in resp.data