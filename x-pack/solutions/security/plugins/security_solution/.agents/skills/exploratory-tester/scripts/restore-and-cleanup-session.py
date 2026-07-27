#!/usr/bin/env python3
"""Restore shared CCS state before cleaning up session-owned resources."""

import argparse
import subprocess
import sys
from pathlib import Path

from session_resources import (
    ccs_cleanup_blocked,
    ccs_operation_lock,
    edit_session_config,
    release_ccs_deployment_lease,
    session_operation_lock,
)


SCRIPT_DIR = Path(__file__).resolve().parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--kind")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    session_dir = Path(args.session_dir)
    config_path = session_dir / "config.json"
    try:
        with edit_session_config(config_path, persist=False) as config:
            restore_required = ccs_cleanup_blocked(config)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if restore_required and args.dry_run:
        print(
            "Dry run cannot continue while CCS restoration is required.",
            file=sys.stderr,
        )
        return 1

    if restore_required:
        restore_result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT_DIR / "restore-remote-cluster.py"),
                "--session-dir",
                str(session_dir),
                "--keep-lease",
            ],
            check=False,
        )
        if restore_result.returncode != 0:
            print(
                "Session cleanup blocked because CCS restoration did not complete.",
                file=sys.stderr,
            )
            return restore_result.returncode

    try:
        with session_operation_lock(config_path, "ccs-restore"):
            with edit_session_config(config_path, persist=False) as config:
                if ccs_cleanup_blocked(config):
                    print(
                        "Session cleanup blocked because CCS state changed before cleanup.",
                        file=sys.stderr,
                    )
                    return 1

            cleanup_args = [
                sys.executable,
                str(SCRIPT_DIR / "cleanup-session-resources.py"),
                "--session-dir",
                str(session_dir),
            ]
            if args.kind:
                cleanup_args.extend(["--kind", args.kind])
            if args.dry_run:
                cleanup_args.append("--dry-run")
            cleanup_result = subprocess.run(cleanup_args, check=False)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if cleanup_result.returncode != 0:
        return cleanup_result.returncode

    try:
        with ccs_operation_lock(config_path):
            with edit_session_config(config_path, persist=False) as config:
                release_ccs_deployment_lease(config)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
