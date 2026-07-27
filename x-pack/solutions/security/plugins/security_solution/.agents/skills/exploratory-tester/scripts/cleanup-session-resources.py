#!/usr/bin/env python3
"""Safely and idempotently clean resources owned by one exploratory session."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from session_resources import (
    build_auth_args,
    cleanup_candidates,
    require_session_id,
    validate_resource_endpoint,
)


SUCCESSFUL_DELETE_STATUSES = {"200", "204", "404"}
CCS_RESOURCE_KINDS = {"ccs_remote_cluster_snapshot", "ccs_remote_cluster"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--session-dir",
        required=True,
        help="Path to the session directory (contains config.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print owned resources without issuing delete requests",
    )
    parser.add_argument(
        "--kind",
        choices=(
            "kibana_space",
            "es_index",
            "kibana_user",
            "kibana_role",
            "connector",
            "detection_rule",
            "ccs_remote_cluster",
            "ccs_remote_cluster_snapshot",
        ),
        help="Restrict cleanup to one resource kind",
    )
    return parser.parse_args()


def _load_config(config_path: Path) -> dict[str, Any]:
    with config_path.open(encoding="utf-8") as config_file:
        config = json.load(config_file)
    if not isinstance(config, dict):
        raise ValueError("Session config must be a JSON object")
    return config


def _write_config(config_path: Path, config: dict[str, Any]) -> None:
    temporary_path = config_path.with_suffix(".json.tmp")
    with temporary_path.open("w", encoding="utf-8") as config_file:
        json.dump(config, config_file, indent=2)
        config_file.write("\n")
    temporary_path.replace(config_path)


def _resource_url(config: dict[str, Any], resource: dict[str, Any]) -> str:
    endpoint = resource.get("endpoint")
    try:
        validate_resource_endpoint(endpoint)
    except ValueError as exc:
        raise ValueError(f"Unsafe cleanup endpoint for {resource.get('id')!r}") from exc

    base_url_key = resource.get("base_url", "url")
    environment = config.get("environment", {})
    base_url = environment.get(base_url_key)
    if not isinstance(base_url, str) or not base_url:
        raise ValueError(
            f"Environment is missing {base_url_key!r} for resource {resource.get('id')!r}"
        )
    return f"{base_url.rstrip('/')}{endpoint}"


def _http_status(stdout: str) -> str:
    value = stdout.strip()
    if value.isdigit() and len(value) == 3:
        return value
    lines = value.rsplit("\n", 1)
    return lines[-1] if len(lines) > 1 else "000"


def _cleanup_order(resource: dict[str, Any]) -> tuple[int, str]:
    kind = resource.get("kind")
    return (0 if kind in CCS_RESOURCE_KINDS else 1, str(resource.get("id", "")))


def cleanup_session(
    config: dict[str, Any],
    dry_run: bool,
    resource_kind: str | None = None,
) -> tuple[int, list[str]]:
    require_session_id(config)
    resources = sorted(
        (
            resource
            for resource in cleanup_candidates(config)
            if resource_kind is None or resource.get("kind") == resource_kind
        ),
        key=_cleanup_order,
    )
    if not resources:
        return 0, ["No owned session resources to clean up."]

    try:
        auth_args = build_auth_args(config)
    except ValueError as exc:
        return 1, [str(exc)]

    messages: list[str] = []
    errors: list[str] = []
    for resource in resources:
        resource_id = resource["id"]
        if resource.get("kind") in CCS_RESOURCE_KINDS:
            messages.append(
                f"CCS resource {resource_id!r} skipped; restore it before cleanup."
            )
            continue
        if dry_run:
            messages.append(f"Would clean {resource['kind']} {resource_id!r}")
            continue

        try:
            target_url = _resource_url(config, resource)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        method = resource.get("method", "DELETE")
        if method != "DELETE":
            errors.append(f"Unsupported cleanup method {method!r} for {resource_id!r}")
            continue

        result = subprocess.run(
            [
                "curl",
                "-s",
                "-w",
                "\n%{http_code}",
                *auth_args,
                "-X",
                method,
                target_url,
                "-H",
                "kbn-xsrf: true",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        status = _http_status(result.stdout)
        if status in SUCCESSFUL_DELETE_STATUSES:
            resource["cleanup_status"] = (
                "already_gone" if status == "404" else "deleted"
            )
            resource["cleanup_http_code"] = int(status)
            messages.append(
                f"Resource {resource_id!r}: {resource['cleanup_status']}"
            )
        else:
            errors.append(
                f"Resource {resource_id!r}: cleanup failed (HTTP {status})"
            )

    if not dry_run:
        messages.extend(errors)
    return (1 if errors else 0), messages


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"
    try:
        config = _load_config(config_path)
        exit_code, messages = cleanup_session(config, args.dry_run, args.kind)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    output = "\n".join(messages)
    if exit_code:
        print(output, file=sys.stderr)
    else:
        print(output)

    if not args.dry_run:
        _write_config(config_path, config)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
