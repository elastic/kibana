#!/usr/bin/env python3
"""Restore and verify a CCS remote cluster from its durable session snapshot."""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from session_resources import (
    build_auth_args,
    edit_session_config,
    http_status,
    resolve_resource_base_url,
    validate_resource_endpoint,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    return parser.parse_args()


def _response_body(stdout: str) -> str:
    lines = stdout.strip().splitlines()
    return "\n".join(lines[:-1]) if len(lines) > 1 else ""


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"

    with edit_session_config(config_path) as config:
        restore = config.get("ccs_restore")
        if not isinstance(restore, dict):
            print("Session config has no durable CCS restore snapshot.", file=sys.stderr)
            return 1

        endpoint = restore.get("endpoint")
        payload = restore.get("payload")
        alias = restore.get("remote_cluster_alias")
        if (
            not isinstance(endpoint, str)
            or not isinstance(payload, dict)
            or not isinstance(alias, str)
        ):
            print("CCS restore snapshot is malformed.", file=sys.stderr)
            return 1
        validate_resource_endpoint(endpoint)

        auth_args = build_auth_args(config)
        source_url = resolve_resource_base_url(config, "url")
        restore_result = subprocess.run(
            [
                "curl",
                "-s",
                "-w",
                "\n%{http_code}",
                *auth_args,
                "-X",
                "PUT",
                f"{source_url}{endpoint}",
                "-H",
                "kbn-xsrf: true",
                "-H",
                "Content-Type: application/json",
                "-d",
                json.dumps(payload, separators=(",", ":")),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        restore_status = http_status(restore_result.stdout)
        if restore_status != "200":
            print(
                f"CCS restore failed (HTTP {restore_status}).",
                file=sys.stderr,
            )
            return 1

        es_url = resolve_resource_base_url(config, "es_url")
        verify_result = subprocess.run(
            [
                "curl",
                "-s",
                "-w",
                "\n%{http_code}",
                *auth_args,
                "-X",
                "GET",
                f"{es_url}/_remote/info",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        verify_status = http_status(verify_result.stdout)
        if verify_status != "200":
            print(
                f"CCS restore verification failed (HTTP {verify_status}).",
                file=sys.stderr,
            )
            return 1

        try:
            remote_info: Any = json.loads(_response_body(verify_result.stdout))
        except json.JSONDecodeError as exc:
            print(f"Invalid CCS verification response: {exc}", file=sys.stderr)
            return 1

        cluster_info = remote_info.get(alias) if isinstance(remote_info, dict) else None
        if not isinstance(cluster_info, dict) or cluster_info.get("connected") is not True:
            print(
                f"CCS remote cluster {alias!r} is not connected after restore.",
                file=sys.stderr,
            )
            return 1

        config["ccs_state"] = "restored"
        config["ccs_restored"] = True

    print(f"Restored and verified CCS remote cluster {alias!r}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
