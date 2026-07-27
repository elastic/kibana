#!/usr/bin/env python3
"""Backward-compatible wrapper for the session resource cleanup command."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    cleanup_script = Path(__file__).with_name("cleanup-session-resources.py")
    result = subprocess.run(
        [
            sys.executable,
            str(cleanup_script),
            *sys.argv[1:],
            "--kind",
            "kibana_space",
        ],
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
