"""
test_battery_monitor.py - Unit tests for BatteryMonitor
"""
import time
import pytest
from unittest.mock import patch, mock_open, MagicMock, call


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_monitor(bus_num=1, addr=0x40, initial_ah=None):
    """Construct a BatteryMonitor with all I/O patched out."""
    with (
        patch("battery_monitor.SMBus"),
        patch("battery_monitor.sqlite3.connect"),
        patch("battery_monitor.threading.Thread"),
        patch("battery_monitor.BatteryMonitor.load_state", return_value=initial_ah or 8.0),
    ):
        from battery_monitor import BatteryMonitor
        monitor = BatteryMonitor(bus_num, addr)
    return monitor


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

class TestBatteryMonitorInit:
    def test_initial_ah_loaded_from_state(self):
        monitor = make_monitor(initial_ah=5.5)
        assert monitor.current_ah == 5.5

    def test_initial_ah_defaults_to_capacity_when_no_file(self):
        with (
            patch("battery_monitor.SMBus"),
            patch("battery_monitor.sqlite3.connect"),
            patch("battery_monitor.threading.Thread"),
            patch("os.path.exists", return_value=False),
        ):
            from battery_monitor import BatteryMonitor, BATTERY_CAPACITY_AH
            monitor = BatteryMonitor(1, 0x40)
        assert monitor.current_ah == BATTERY_CAPACITY_AH

    def test_calibration_register_written_on_init(self):
        with (
            patch("battery_monitor.SMBus") as mock_smbus_cls,
            patch("battery_monitor.sqlite3.connect"),
            patch("battery_monitor.threading.Thread"),
            patch("battery_monitor.BatteryMonitor.load_state", return_value=8.0),
        ):
            from battery_monitor import BatteryMonitor
            BatteryMonitor(1, 0x40)
        # write_i2c_block_data must have been called (calibration register 0x05)
        mock_bus_instance = mock_smbus_cls.return_value
        mock_bus_instance.write_i2c_block_data.assert_called_once()
        reg = mock_bus_instance.write_i2c_block_data.call_args[0][1]
        assert reg == 0x05


# ---------------------------------------------------------------------------
# load_state / save_state
# ---------------------------------------------------------------------------

class TestStateFile:
    def test_load_state_reads_float_from_file(self):
        with (
            patch("os.path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data="6.25")),
            patch("battery_monitor.SMBus"),
            patch("battery_monitor.sqlite3.connect"),
            patch("battery_monitor.threading.Thread"),
        ):
            from battery_monitor import BatteryMonitor
            monitor = BatteryMonitor(1, 0x40)
        assert monitor.current_ah == 6.25

    def test_load_state_returns_capacity_on_corrupt_file(self):
        with (
            patch("os.path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data="not-a-float")),
            patch("battery_monitor.SMBus"),
            patch("battery_monitor.sqlite3.connect"),
            patch("battery_monitor.threading.Thread"),
        ):
            from battery_monitor import BatteryMonitor, BATTERY_CAPACITY_AH
            monitor = BatteryMonitor(1, 0x40)
        assert monitor.current_ah == BATTERY_CAPACITY_AH

    def test_save_state_writes_current_ah(self):
        monitor = make_monitor(initial_ah=4.0)
        m = mock_open()
        with patch("builtins.open", m):
            monitor.save_state()
        m().write.assert_called_once_with("4.0")


# ---------------------------------------------------------------------------
# get_update — Coulomb counting and SOC
# ---------------------------------------------------------------------------

class TestGetUpdate:
    def _monitor_with_readings(self, v_raw, i_raw, initial_ah=8.0):
        monitor = make_monitor(initial_ah=initial_ah)
        monitor.bus.read_i2c_block_data.side_effect = [
            [(v_raw >> 8) & 0xFF, v_raw & 0xFF],   # voltage register
            [(i_raw >> 8) & 0xFF, i_raw & 0xFF],   # current register
        ]
        return monitor

    def test_voltage_conversion(self):
        # v_raw=11200 → 11200 * 0.00125 = 14.0 V
        monitor = self._monitor_with_readings(v_raw=11200, i_raw=0)
        v, _, _ = monitor.get_update()
        assert abs(v - 14.0) < 0.01

    def test_positive_current_conversion(self):
        # i_raw=1000 → 1.0 A (charging)
        monitor = self._monitor_with_readings(v_raw=0, i_raw=1000)
        _, i, _ = monitor.get_update()
        assert abs(i - 1.0) < 0.001

    def test_negative_current_two_complement(self):
        # i_raw=65036 (= 65536 - 500) → -0.5 A (discharging)
        monitor = self._monitor_with_readings(v_raw=0, i_raw=65036)
        _, i, _ = monitor.get_update()
        assert abs(i - (-0.5)) < 0.001

    def test_soc_clamped_at_100(self):
        # Start at full capacity; any positive current should not exceed 100 %
        monitor = self._monitor_with_readings(v_raw=0, i_raw=5000, initial_ah=8.0)
        _, _, soc = monitor.get_update()
        assert soc <= 100.0

    def test_soc_clamped_at_0(self):
        # Start at 0 Ah; discharging cannot go negative
        monitor = self._monitor_with_readings(v_raw=0, i_raw=65036, initial_ah=0.0)
        _, _, soc = monitor.get_update()
        assert soc >= 0.0

    def test_full_battery_calibration_at_142v(self):
        # v >= 14.2 V and near-zero current should force SOC to 100 %
        monitor = make_monitor(initial_ah=3.0)
        # 14.2 / 0.00125 = 11360
        monitor.bus.read_i2c_block_data.side_effect = [
            [0x2C, 0x60],  # 11360 >> 8=0x2C, & 0xFF=0x60 → 14.2 V
            [0x00, 0x00],  # 0 A
        ]
        _, _, soc = monitor.get_update()
        assert soc == 100.0

    def test_read_error_returns_zero_and_continues(self):
        monitor = make_monitor(initial_ah=8.0)
        monitor.bus.read_i2c_block_data.side_effect = Exception("I2C error")
        # Should not raise; registers return 0 via except clause
        v, i, soc = monitor.get_update()
        assert v == 0.0
        assert i == 0.0
