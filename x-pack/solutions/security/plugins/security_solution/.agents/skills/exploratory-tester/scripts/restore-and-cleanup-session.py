#!/usr/bin/env python3
"""Restore shared CCS state before cleaning up session-owned resources."""

import subprocess
import sys
from pathlib import Path

from session_resources import ccs_cleanup_blocked, edit_session_config


SCRIPT_DIR = Path(__file__).resolve().parent


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] != "--session-dir":
        print("Usage: restore-and-cleanup-session.py --session-dir <path>", file=sys.stderr)
        return 2

    session_dir = Path(sys.argv[2])
    config_path = session_dir / "config.json"
    try:
        with edit_session_config(config_path, persist=False) as config:
            restore_required = ccs_cleanup_blocked(config)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if restore_required:
        restore_result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT_DIR / "restore-remote-cluster.py"),
                "--session-dir",
                str(session_dir),
            ],
            check=False,
        )
        if restore_result.returncode != 0:
            print(
                "Session cleanup blocked because CCS restoration did not complete.",
                file=sys.stderr,
            )
            return restore_result.returncode

    cleanup_result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_DIR / "cleanup-session-resources.py"),
            "--session-dir",
            str(session_dir),
        ],
        check=False,
    )
    return cleanup_result.returncode


if __name__ == "__main__":
    sys.exit(main())
