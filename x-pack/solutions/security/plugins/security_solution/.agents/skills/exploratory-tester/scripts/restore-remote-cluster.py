#!/usr/bin/env python3
"""Restore and verify a CCS remote cluster from its durable session snapshot."""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from session_resources import (
    build_auth_args,
    edit_session_config,
    http_status,
    resolve_resource_base_url,
    validate_resource_endpoint,
)


RESTORE_FIELDS = (
    "skipUnavailable",
    "mode",
    "seeds",
    "nodeConnections",
    "proxyAddress",
    "proxySocketConnections",
    "serverName",
    "hasDeprecatedProxySetting",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--timeout-seconds", type=float, default=60.0)
    parser.add_argument("--poll-interval-seconds", type=float, default=2.0)
    return parser.parse_args()


def _response_body(stdout: str) -> str:
    lines = stdout.strip().splitlines()
    return "\n".join(lines[:-1]) if len(lines) > 1 else ""


def _run_curl(curl_args: list[str]) -> tuple[str, str]:
    result = subprocess.run(
        curl_args,
        capture_output=True,
        text=True,
        check=False,
    )
    return http_status(result.stdout), _response_body(result.stdout)


def _find_cluster(payload: object, alias: str) -> dict[str, object] | None:
    if isinstance(payload, list):
        return next(
            (
                cluster
                for cluster in payload
                if isinstance(cluster, dict) and cluster.get("name") == alias
            ),
            None,
        )
    if isinstance(payload, dict):
        cluster = payload.get(alias)
        if isinstance(cluster, dict):
            return cluster
        cluster = payload.get("remote")
        if isinstance(cluster, dict) and cluster.get("name", alias) == alias:
            return cluster
    return None


def _cluster_matches_snapshot(
    cluster: dict[str, object],
    payload: dict[str, object],
    provenance: dict[str, object],
) -> bool:
    for field in RESTORE_FIELDS:
        expected = payload.get(field)
        actual = cluster.get(
            field, False if field == "hasDeprecatedProxySetting" else None
        )
        if actual != expected:
            return False
    return cluster.get("isConfiguredByNode") is provenance.get(
        "is_configured_by_node"
    )


def _verify_restored_cluster(
    *,
    auth_args: list[str],
    source_url: str,
    es_url: str,
    alias: str,
    payload: dict[str, object],
    provenance: dict[str, object],
) -> tuple[bool, str]:
    collection_endpoint = validate_resource_endpoint("/api/remote_clusters")
    config_status, config_body = _run_curl(
        [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            "GET",
            f"{source_url}{collection_endpoint}",
        ]
    )
    if config_status != "200":
        return False, f"remote-cluster configuration check returned HTTP {config_status}"
    try:
        config_response = json.loads(config_body)
    except json.JSONDecodeError as exc:
        return False, f"invalid remote-cluster configuration response: {exc}"

    cluster = _find_cluster(config_response, alias)
    if cluster is None:
        return False, f"remote cluster {alias!r} was not found after restore"
    if not _cluster_matches_snapshot(cluster, payload, provenance):
        return False, f"remote cluster {alias!r} configuration differs from snapshot"

    info_status, info_body = _run_curl(
        [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            "GET",
            f"{es_url}/_remote/info",
        ]
    )
    if info_status != "200":
        return False, f"CCS connectivity check returned HTTP {info_status}"
    try:
        remote_info = json.loads(info_body)
    except json.JSONDecodeError as exc:
        return False, f"invalid CCS connectivity response: {exc}"
    cluster_info = remote_info.get(alias) if isinstance(remote_info, dict) else None
    if not isinstance(cluster_info, dict) or cluster_info.get("connected") is not True:
        return False, f"CCS remote cluster {alias!r} is not connected"
    return True, ""


def main() -> int:
    args = parse_args()
    if args.timeout_seconds < 0 or args.poll_interval_seconds < 0:
        print("Timeout and poll interval must not be negative.", file=sys.stderr)
        return 1
    config_path = Path(args.session_dir) / "config.json"

    with edit_session_config(config_path) as config:
        restore = config.get("ccs_restore")
        if not isinstance(restore, dict):
            print("Session config has no durable CCS restore snapshot.", file=sys.stderr)
            return 1

        endpoint = restore.get("endpoint")
        payload = restore.get("payload")
        alias = restore.get("remote_cluster_alias")
        provenance = restore.get("provenance")
        if (
            not isinstance(endpoint, str)
            or not isinstance(payload, dict)
            or not isinstance(alias, str)
            or not isinstance(provenance, dict)
            or not isinstance(provenance.get("is_configured_by_node"), bool)
            or not isinstance(provenance.get("has_deprecated_proxy_setting"), bool)
            or any(field not in payload for field in RESTORE_FIELDS)
            or payload.get("hasDeprecatedProxySetting")
            != provenance.get("has_deprecated_proxy_setting")
        ):
            print("CCS restore snapshot is malformed.", file=sys.stderr)
            return 1
        validate_resource_endpoint(endpoint)

        auth_args = build_auth_args(config)
        source_url = resolve_resource_base_url(config, "url")
        is_configured_by_node = provenance["is_configured_by_node"]
        if is_configured_by_node:
            restore_args = [
                "curl",
                "-s",
                "-w",
                "\n%{http_code}",
                *auth_args,
                "-X",
                "DELETE",
                f"{source_url}{endpoint}",
                "-H",
                "kbn-xsrf: true",
            ]
            allowed_restore_statuses = {"200", "404"}
        else:
            restore_args = [
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
            ]
            allowed_restore_statuses = {"200"}
        restore_status, _ = _run_curl(restore_args)
        if restore_status not in allowed_restore_statuses:
            print(
                f"CCS restore failed (HTTP {restore_status}).",
                file=sys.stderr,
            )
            return 1

        es_url = resolve_resource_base_url(config, "es_url")
        deadline = time.monotonic() + args.timeout_seconds
        last_error = "verification did not run"
        while True:
            verified, error = _verify_restored_cluster(
                auth_args=auth_args,
                source_url=source_url,
                es_url=es_url,
                alias=alias,
                payload=payload,
                provenance=provenance,
            )
            if verified:
                break
            last_error = error
            if time.monotonic() >= deadline:
                print(
                    f"CCS restore verification timed out: {last_error}.",
                    file=sys.stderr,
                )
                return 1
            time.sleep(args.poll_interval_seconds)

        config["ccs_state"] = "restored"
        config["ccs_restored"] = True

    print(f"Restored and verified CCS remote cluster {alias!r}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
