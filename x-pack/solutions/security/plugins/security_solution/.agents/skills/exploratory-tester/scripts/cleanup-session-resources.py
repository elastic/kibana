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
    ccs_cleanup_blocked,
    cleanup_candidates,
    edit_session_config,
    http_status,
    pending_resources,
    require_session_id,
    resolve_resource_base_url,
    validate_resource_endpoint,
)


SUCCESSFUL_CLEANUP_STATUSES = {"200", "202", "204", "404"}
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
            "es_alerts",
            "ccs_remote_cluster",
            "ccs_remote_cluster_snapshot",
        ),
        help="Restrict cleanup to one resource kind",
    )
    return parser.parse_args()


def _resource_url(config: dict[str, Any], resource: dict[str, Any]) -> str:
    endpoint = resource.get("endpoint")
    try:
        validate_resource_endpoint(endpoint)
    except ValueError as exc:
        raise ValueError(f"Unsafe cleanup endpoint for {resource.get('id')!r}") from exc

    base_url_key = resource.get("base_url", "url")
    if not isinstance(base_url_key, str):
        raise ValueError(
            f"Invalid base URL key for resource {resource.get('id')!r}"
        )
    try:
        base_url = resolve_resource_base_url(config, base_url_key)
    except ValueError as exc:
        raise ValueError(
            f"{exc} for resource {resource.get('id')!r}"
        ) from exc
    return f"{base_url.rstrip('/')}{endpoint}"


def _cleanup_order(resource: dict[str, Any]) -> tuple[int, str]:
    kind = resource.get("kind")
    return (0 if kind in CCS_RESOURCE_KINDS else 1, str(resource.get("id", "")))


def _response_body(stdout: str) -> str:
    lines = stdout.strip().splitlines()
    return "\n".join(lines[:-1]) if len(lines) > 1 else ""


def _delete_by_query_error(
    *,
    resource_id: str,
    status: str,
    response_body: str,
) -> str | None:
    if status == "404":
        return None
    try:
        response = json.loads(response_body)
    except json.JSONDecodeError as exc:
        return f"Resource {resource_id!r}: invalid delete_by_query response: {exc}"
    if not isinstance(response, dict):
        return f"Resource {resource_id!r}: delete_by_query response was not an object"
    if response.get("timed_out") is not False:
        return f"Resource {resource_id!r}: delete_by_query timed out"
    failures = response.get("failures")
    if not isinstance(failures, list) or failures:
        return f"Resource {resource_id!r}: delete_by_query reported failures"
    return None


def cleanup_session(
    config: dict[str, Any],
    dry_run: bool,
    resource_kind: str | None = None,
) -> tuple[int, list[str]]:
    require_session_id(config)
    if ccs_cleanup_blocked(config):
        return 1, [
            "CCS cleanup blocked until the remote-cluster state is restored "
            "and ccs_state is restored in config.json."
        ]

    pending = pending_resources(config)
    pending_message: str | None = None
    if pending:
        pending_ids = ", ".join(repr(resource["id"]) for resource in pending)
        pending_message = (
            f"Pending session resources require reconciliation before cleanup: "
            f"{pending_ids}"
        )

    resources = sorted(
        (
            resource
            for resource in cleanup_candidates(config)
            if resource_kind is None or resource.get("kind") == resource_kind
        ),
        key=_cleanup_order,
    )
    messages = [pending_message] if pending_message else []
    if not resources:
        if pending_message:
            return (0 if dry_run else 1), messages
        return 0, ["No owned session resources to clean up."]

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

        base_url_key = resource.get("base_url", "url")
        if not isinstance(base_url_key, str):
            errors.append(f"Invalid base URL key for resource {resource_id!r}")
            continue
        try:
            auth_args = build_auth_args(config, base_url_key=base_url_key)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        method = resource.get("method", "DELETE")
        if method not in {"DELETE", "POST"}:
            errors.append(f"Unsupported cleanup method {method!r} for {resource_id!r}")
            continue

        curl_args = [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            method,
            target_url,
        ]
        if method == "POST":
            body = resource.get("body")
            if not isinstance(body, str):
                errors.append(f"Missing JSON cleanup body for {resource_id!r}")
                continue
            try:
                json.loads(body)
            except json.JSONDecodeError as exc:
                errors.append(
                    f"Invalid JSON cleanup body for {resource_id!r}: {exc}"
                )
                continue
            curl_args.extend(["-H", "Content-Type: application/json", "-d", body])
        if base_url_key == "url":
            curl_args.extend(["-H", "kbn-xsrf: true"])
        result = subprocess.run(
            curl_args,
            capture_output=True,
            text=True,
            check=False,
        )
        status = http_status(result.stdout)
        if status in SUCCESSFUL_CLEANUP_STATUSES:
            if method == "POST" and "_delete_by_query" in str(
                resource.get("endpoint", "")
            ):
                delete_by_query_error = _delete_by_query_error(
                    resource_id=resource_id,
                    status=status,
                    response_body=_response_body(result.stdout),
                )
                if delete_by_query_error is not None:
                    errors.append(delete_by_query_error)
                    continue
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
    return (
        1 if errors or (pending_message is not None and not dry_run) else 0,
        messages,
    )


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"
    try:
        with edit_session_config(config_path, persist=not args.dry_run) as config:
            exit_code, messages = cleanup_session(config, args.dry_run, args.kind)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    output = "\n".join(messages)
    if exit_code:
        print(output, file=sys.stderr)
    else:
        print(output)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
