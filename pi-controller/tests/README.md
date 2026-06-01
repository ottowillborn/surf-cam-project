cd pi-controller
python3 -m venv venv
venv\Scripts\Activate.ps1 or source venv/bin/activate

pip install -r requirements-test.txt

# All tests
pytest tests/

# With coverage report
pytest tests/ --cov=. --cov-report=term-missing

# A single file
pytest tests/test_battery_monitor.py -v