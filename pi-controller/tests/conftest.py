"""
conftest.py - Mocks hardware dependencies before any imports.
Must run before battery_monitor, camera_server, or controller are imported.
"""
import sys
from unittest.mock import MagicMock
 
# --- Mock Pi-specific hardware libraries ---
smbus2_mock = MagicMock()
sys.modules["smbus2"] = smbus2_mock
 
picamera2_mock = MagicMock()
sys.modules["picamera2"] = picamera2_mock
 