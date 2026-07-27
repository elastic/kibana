#!/usr/bin/env python3
"""Reconcile a pending resource by probing its remote endpoint."""

import argparse
import subprocess
import sys
from pathlib import Path

from session_resources import (
    build_auth_args,
    edit_session_config,
    http_status,
    reconcile_pending_resource,
    resolve_resource_base_url,
    validate_resource_endpoint,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--kind", required=True)
    parser.add_argument("--id", dest="resource_id", required=True)
    parser.add_argument("--endpoint", required=True)
    parser.add_argument(
        "--base-url",
        choices=("url", "es_url", "ccs_remote_es_url"),
        default="url",
    )
    parser.add_argument(
        "--probe-method",
        choices=("GET", "HEAD"),
        default="GET",
    )
    parser.add_argument("--flow-space", action="store_true")
    parser.add_argument("--fail-on-absent", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        endpoint = validate_resource_endpoint(args.endpoint)
        config_path = Path(args.session_dir) / "config.json"

        with edit_session_config(config_path) as config:
            auth_args = build_auth_args(config, base_url_key=args.base_url)
            base_url = resolve_resource_base_url(config, args.base_url)
            result = subprocess.run(
                [
                    "curl",
                    "-s",
                    "-o",
                    "/dev/null",
                    "-w",
                    "\n%{http_code}",
                    *auth_args,
                    "-X",
                    args.probe_method,
                    f"{base_url}{endpoint}",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            status = http_status(result.stdout)
            transition = reconcile_pending_resource(
                config,
                kind=args.kind,
                resource_id=args.resource_id,
                endpoint=endpoint,
                base_url=args.base_url,
                http_code=status,
                track_flow_space=args.flow_space,
            )
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if transition == "owned":
        print(f"Reconciled {args.kind} {args.resource_id!r} as owned.")
        return 0
    if transition == "removed":
        print(f"Removed absent pending {args.kind} {args.resource_id!r}.")
        return 1 if args.fail_on_absent else 0
    print(
        f"Could not reconcile pending {args.kind} {args.resource_id!r} "
        f"(probe HTTP {status}); reservation remains pending.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
