#!/usr/bin/env python3
"""Register a resource in the current session's ownership manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from session_resources import (
    edit_session_config,
    register_resource,
    remove_pending_resource,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--kind", required=True)
    parser.add_argument("--id", required=True, dest="resource_id")
    parser.add_argument("--endpoint", required=True)
    parser.add_argument(
        "--base-url",
        default="url",
        choices=("url", "es_url", "ccs_remote_es_url"),
    )
    parser.add_argument("--method", choices=("DELETE", "POST"), default="DELETE")
    parser.add_argument("--body-json")
    ownership = parser.add_mutually_exclusive_group(required=True)
    ownership.add_argument("--owned", action="store_true")
    ownership.add_argument("--reused", action="store_true")
    ownership.add_argument("--pending", action="store_true")
    ownership.add_argument("--remove-pending", action="store_true")
    parser.add_argument("--protected", action="store_true")
    parser.add_argument(
        "--confirm-preexisting",
        action="store_true",
        help=(
            "With --reused, allow discarding this session's pending reservation "
            "because the resource was confirmed to exist before the session "
            "reserved it (for example a 409 on create)."
        ),
    )
    parser.add_argument(
        "--flow-space",
        action="store_true",
        help="Also update created_flow_spaces/reused_flow_spaces",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"
    try:
        with edit_session_config(config_path) as config:
            if args.remove_pending:
                remove_pending_resource(
                    config,
                    kind=args.kind,
                    resource_id=args.resource_id,
                )
                print(
                    f"Removed pending {args.kind} {args.resource_id!r} "
                    "reservation."
                )
                return 0

            body = args.body_json
            if body is not None:
                body = json.dumps(json.loads(body), separators=(",", ":"))
            resource = register_resource(
                config,
                kind=args.kind,
                resource_id=args.resource_id,
                owned=args.owned,
                endpoint=args.endpoint,
                method=args.method,
                base_url=args.base_url,
                protected=args.protected,
                track_flow_space=args.flow_space,
                body=body,
                state="pending" if args.pending else None,
                allow_pending_downgrade=args.confirm_preexisting,
            )
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(
        f"Registered {args.kind} {args.resource_id!r} "
        f"({resource['state']})."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
