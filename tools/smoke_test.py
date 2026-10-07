"""Run the current 0.3 native and RIDI integration regression."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).with_name('native_smoke_test.py')),run_name='__main__')
