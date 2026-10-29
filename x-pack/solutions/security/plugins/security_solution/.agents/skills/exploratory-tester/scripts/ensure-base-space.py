#!/usr/bin/env python3
"""Validate or provision the configured base space without unsafe ownership."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import quote

from session_resources import (
    build_auth_args,
    edit_session_config,
    ensure_session_manifest,
    register_resource,
    run_curl,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    args = parser.parse_args()

    config_path = Path(args.session_dir) / "config.json"
    try:
        with edit_session_config(config_path) as config:
            session_id = ensure_session_manifest(config)
            environment = config["environment"]
            url = environment["url"].rstrip("/")
            space_id = environment.get("space_id", "exploratory-testing")
            endpoint = f"/api/spaces/space/{quote(space_id, safe='')}"

            try:
                auth_args = build_auth_args(config)
            except ValueError as exc:
                print(str(exc), file=sys.stderr)
                return 1

            try:
                existing_status, _ = run_curl(
                    [
                        "curl",
                        "-s",
                        "-o",
                        "/dev/null",
                        "-w",
                        "\n%{http_code}",
                        *auth_args,
                        "-X",
                        "GET",
                        f"{url}{endpoint}",
                    ]
                )
            except TimeoutError as exc:
                print(f"Base space inspection timed out ({exc}).", file=sys.stderr)
                return 1

            if existing_status == "200":
                register_resource(
                    config,
                    kind="kibana_space",
                    resource_id=space_id,
                    owned=False,
                    endpoint=endpoint,
                    protected=True,
                    track_flow_space=False,
                )
                message = f"Base space {space_id!r} exists; reusing it."
            elif existing_status == "404":
                body = json.dumps(
                    {
                        "id": space_id,
                        "name": "Exploratory Testing",
                        "color": "#DD0A73",
                    }
                )
                try:
                    created_status, _ = run_curl(
                        [
                            "curl",
                            "-s",
                            "-w",
                            "\n%{http_code}",
                            *auth_args,
                            "-X",
                            "POST",
                            f"{url}/api/spaces/space",
                            "-H",
                            "kbn-xsrf: true",
                            "-H",
                            "Content-Type: application/json",
                            "-d",
                            body,
                        ]
                    )
                except TimeoutError as exc:
                    print(f"Base space creation timed out ({exc}).", file=sys.stderr)
                    return 1
                if created_status == "200":
                    register_resource(
                        config,
                        kind="kibana_space",
                        resource_id=space_id,
                        owned=True,
                        endpoint=endpoint,
                        protected=True,
                        track_flow_space=False,
                    )
                    message = (
                        f"Base space {space_id!r} created by session {session_id}."
                    )
                elif created_status == "409":
                    register_resource(
                        config,
                        kind="kibana_space",
                        resource_id=space_id,
                        owned=False,
                        endpoint=endpoint,
                        protected=True,
                        track_flow_space=False,
                    )
                    message = f"Base space {space_id!r} already exists; reusing it."
                else:
                    print(
                        f"Unable to create base space {space_id!r} "
                        f"(HTTP {created_status}).",
                        file=sys.stderr,
                    )
                    return 1
            elif existing_status == "401":
                print(
                    "Configured API credentials were rejected (HTTP 401).",
                    file=sys.stderr,
                )
                return 1
            else:
                print(
                    f"Unable to inspect base space {space_id!r} "
                    f"(HTTP {existing_status}).",
                    file=sys.stderr,
                )
                return 1

            print(message)
            return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
