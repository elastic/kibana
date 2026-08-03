#!/usr/bin/env python3
"""Compatibility wrapper for manifest-backed session resource cleanup."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from session_resources import load_session_config


def main() -> int:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--session-dir", required=True)
    parsed_args, _ = parser.parse_known_args()
    config_path = Path(parsed_args.session_dir) / "config.json"
    try:
        config = load_session_config(config_path)
    except (OSError, ValueError):
        config = {}
    if not isinstance(config.get("session_id"), str) or not isinstance(
        config.get("session_resources"), list
    ):
        print(
            "Legacy session config has no ownership manifest; refusing "
            "automatic flow-space cleanup. Clean it up manually or resume "
            "with a session created by the current skill.",
            file=sys.stderr,
        )
        return 1

    restore_cleanup_script = Path(__file__).with_name(
        "restore-and-cleanup-session.py"
    )
    cleanup_args = [
        sys.executable,
        str(restore_cleanup_script),
        "--session-dir",
        str(parsed_args.session_dir),
        "--kind",
        "kibana_space",
    ]
    if "--dry-run" in sys.argv:
        cleanup_args.append("--dry-run")
    result = subprocess.run(
        cleanup_args,
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
