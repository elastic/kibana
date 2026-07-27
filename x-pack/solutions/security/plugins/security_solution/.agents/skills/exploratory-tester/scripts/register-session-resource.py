#!/usr/bin/env python3
"""Register a resource in the current session's ownership manifest."""

from __future__ import annotations

import argparse
from pathlib import Path

from session_resources import edit_session_config, register_resource


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
    ownership = parser.add_mutually_exclusive_group(required=True)
    ownership.add_argument("--owned", action="store_true")
    ownership.add_argument("--reused", action="store_true")
    parser.add_argument("--protected", action="store_true")
    parser.add_argument(
        "--flow-space",
        action="store_true",
        help="Also update created_flow_spaces/reused_flow_spaces",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"
    with edit_session_config(config_path) as config:
        resource = register_resource(
            config,
            kind=args.kind,
            resource_id=args.resource_id,
            owned=args.owned,
            endpoint=args.endpoint,
            base_url=args.base_url,
            protected=args.protected,
            track_flow_space=args.flow_space,
        )
    print(
        f"Registered {args.kind} {args.resource_id!r} "
        f"({'owned' if resource['owned'] else 'reused'})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
