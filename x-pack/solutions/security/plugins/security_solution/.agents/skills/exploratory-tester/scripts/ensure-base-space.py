#!/usr/bin/env python3
"""Validate or provision the configured base space without unsafe ownership."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

from session_resources import build_auth_args, ensure_session_manifest, register_resource


def _status(result: subprocess.CompletedProcess[str]) -> str:
    return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else "000"


def _write_config(config_path: Path, config: dict[str, object]) -> None:
    temporary_path = config_path.with_suffix(".json.tmp")
    with temporary_path.open("w", encoding="utf-8") as config_file:
        json.dump(config, config_file, indent=2)
        config_file.write("\n")
    temporary_path.replace(config_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    args = parser.parse_args()

    config_path = Path(args.session_dir) / "config.json"
    with config_path.open(encoding="utf-8") as config_file:
        config = json.load(config_file)

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

    existing = subprocess.run(
        [
            "curl",
            "-s",
            "-o",
            "/dev/null",
            "-w",
            "%{http_code}",
            *auth_args,
            "-X",
            "GET",
            f"{url}{endpoint}",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    existing_status = _status(existing)

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
        _write_config(config_path, config)
        message = f"Base space {space_id!r} exists; reusing it."
    elif existing_status == "404":
        body = json.dumps(
            {
                "id": space_id,
                "name": "Exploratory Testing",
                "color": "#DD0A73",
            }
        )
        created = subprocess.run(
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
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        created_status = _status(created)
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
            _write_config(config_path, config)
            message = f"Base space {space_id!r} created by session {session_id}."
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
            _write_config(config_path, config)
            message = f"Base space {space_id!r} already exists; reusing it."
        else:
            print(
                f"Unable to create base space {space_id!r} (HTTP {created_status}).",
                file=sys.stderr,
            )
            return 1
    elif existing_status == "401":
        print("Configured API credentials were rejected (HTTP 401).", file=sys.stderr)
        return 1
    else:
        print(
            f"Unable to inspect base space {space_id!r} (HTTP {existing_status}).",
            file=sys.stderr,
        )
        return 1

    print(message)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
