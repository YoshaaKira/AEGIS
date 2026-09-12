"""Root conftest — makes the repo root importable as a package namespace.

pytest is invoked from the repo root (see pyproject.toml testpaths).
Without this, ``from services.api.app.main import app`` fails in CI because
the repo root is not on sys.path when the test runner starts.
"""
import sys
from pathlib import Path

# Ensure the repo root is the first entry on sys.path so that
# ``import services.api.app.main`` resolves correctly.
repo_root = str(Path(__file__).parent)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)
