#!/usr/bin/env python3
"""Persist a writable CCS remote-cluster snapshot for later restoration."""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

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
    parser.add_argument("--alias", required=True)
    return parser.parse_args()


def _response_body(stdout: str) -> str:
    lines = stdout.strip().splitlines()
    return "\n".join(lines[:-1]) if len(lines) > 1 else ""


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


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"

    with edit_session_config(config_path) as config:
        source_url = resolve_resource_base_url(config, "url")
        collection_endpoint = validate_resource_endpoint("/api/remote_clusters")
        endpoint = validate_resource_endpoint(
            f"/api/remote_clusters/{quote(args.alias, safe='')}"
        )
        result = subprocess.run(
            [
                "curl",
                "-s",
                "-w",
                "\n%{http_code}",
                *build_auth_args(config),
                "-X",
                "GET",
                f"{source_url}{collection_endpoint}",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        status = http_status(result.stdout)
        if status != "200":
            print(
                f"Unable to capture remote cluster {args.alias!r} "
                f"(HTTP {status}).",
                file=sys.stderr,
            )
            return 1

        try:
            response_payload = json.loads(_response_body(result.stdout))
        except json.JSONDecodeError as exc:
            print(f"Invalid remote-cluster response: {exc}", file=sys.stderr)
            return 1

        cluster = _find_cluster(response_payload, args.alias)
        if cluster is None:
            print(
                f"Remote cluster {args.alias!r} was not found in the response.",
                file=sys.stderr,
            )
            return 1

        is_configured_by_node = cluster.get("isConfiguredByNode")
        has_deprecated_proxy_setting = cluster.get(
            "hasDeprecatedProxySetting", False
        )
        if (
            not isinstance(cluster.get("mode"), str)
            or not isinstance(cluster.get("skipUnavailable"), bool)
            or not isinstance(is_configured_by_node, bool)
            or not isinstance(has_deprecated_proxy_setting, bool)
        ):
            print(
                "Remote-cluster response is missing required writable or "
                "provenance fields.",
                file=sys.stderr,
            )
            return 1

        payload = {field: cluster.get(field) for field in RESTORE_FIELDS}
        payload["hasDeprecatedProxySetting"] = has_deprecated_proxy_setting
        config["ccs_restore"] = {
            "remote_cluster_alias": args.alias,
            "endpoint": endpoint,
            "payload": payload,
            "provenance": {
                "is_configured_by_node": is_configured_by_node,
                "has_deprecated_proxy_setting": has_deprecated_proxy_setting,
            },
        }

    print(f"Persisted CCS restore snapshot for {args.alias!r}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
