#!/usr/bin/env python3
"""Print this session's ownership state for a resource.

Outputs ``owned``, ``pending`` or ``none``. ``none`` means "not ours": an
unregistered resource, one belonging to another session, or one this session
already recorded as reused (reused entries carry no marker).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from session_resources import (
    load_session_config,
    resource_marker,
    resource_state,
    require_session_id,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--kind", required=True)
    parser.add_argument("--id", required=True, dest="resource_id")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_session_config(Path(args.session_dir) / "config.json")
    session_id = require_session_id(config)
    resource = next(
        (
            item
            for item in config.get("session_resources", [])
            if item.get("kind") == args.kind and item.get("id") == args.resource_id
        ),
        None,
    )
    if resource is None or resource.get("marker") != resource_marker(session_id):
        print("none")
        return 0
    print(resource_state(resource))
    return 0


if __name__ == "__main__":
    sys.exit(main())
