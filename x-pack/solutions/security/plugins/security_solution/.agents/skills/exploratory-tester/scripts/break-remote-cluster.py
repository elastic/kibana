#!/usr/bin/env python3
"""Journal and apply a temporary CCS remote-cluster break."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from session_resources import (
    build_auth_args,
    edit_session_config,
    http_status,
    resolve_resource_base_url,
    session_operation_lock,
    validate_resource_endpoint,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--alias", required=True)
    return parser.parse_args()


def _break_payload(payload: dict[str, object]) -> dict[str, object]:
    broken = dict(payload)
    broken.pop("hasDeprecatedProxySetting", None)
    mode = broken.get("mode")
    if mode == "sniff":
        broken["seeds"] = ["invalid.broken.example:9300"]
        broken["proxyAddress"] = None
        broken["proxySocketConnections"] = None
    elif mode == "proxy":
        broken["proxyAddress"] = "invalid.broken.example:9400"
        broken["seeds"] = None
        broken["nodeConnections"] = None
    else:
        raise ValueError(f"Unsupported CCS mode {mode!r}")
    return broken


def _settings_for_alias(
    settings: dict[str, object],
    *,
    layer: str,
    alias: str,
) -> dict[str, object] | None:
    layer_settings = settings.get(layer)
    if not isinstance(layer_settings, dict):
        return None
    cluster_settings = layer_settings.get("cluster")
    if not isinstance(cluster_settings, dict):
        return None
    remote_settings = cluster_settings.get("remote")
    if not isinstance(remote_settings, dict):
        return None
    alias_settings = remote_settings.get(alias)
    return alias_settings if isinstance(alias_settings, dict) else None


def _break_settings(
    *,
    alias: str,
    layer: str,
    settings: dict[str, object],
    payload: dict[str, object],
    has_deprecated_proxy_setting: bool,
) -> dict[str, object]:
    original = _settings_for_alias(settings, layer=layer, alias=alias)
    if original is None:
        raise ValueError(f"CCS snapshot has no {layer} settings for {alias!r}")
    broken = dict(original)
    mode = payload.get("mode")
    if mode == "sniff":
        broken["seeds"] = ["invalid.broken.example:9300"]
        broken["proxy_address"] = None
        broken["proxy_socket_connections"] = None
        broken["server_name"] = None
        broken["node_connections"] = None
    elif mode == "proxy":
        broken["proxy_address"] = "invalid.broken.example:9400"
        broken["proxy_socket_connections"] = None
        broken["server_name"] = None
        broken["seeds"] = None
        broken["node_connections"] = None
        if has_deprecated_proxy_setting or "proxy" in broken:
            broken["proxy"] = "invalid.broken.example:9400"
    else:
        raise ValueError(f"Unsupported CCS mode {mode!r}")
    return {layer: {"cluster": {"remote": {alias: broken}}}}


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"

    try:
        with session_operation_lock(config_path, "ccs-restore"):
            with edit_session_config(config_path) as config:
                restore = config.get("ccs_restore")
                if not isinstance(restore, dict):
                    print(
                        "Session config has no durable CCS restore snapshot.",
                        file=sys.stderr,
                    )
                    return 1
                alias = restore.get("remote_cluster_alias")
                payload = restore.get("payload")
                endpoint = restore.get("endpoint")
                provenance = restore.get("provenance")
                if (
                    alias != args.alias
                    or not isinstance(payload, dict)
                    or not isinstance(endpoint, str)
                    or not isinstance(provenance, dict)
                    or not isinstance(provenance.get("is_configured_by_node"), bool)
                    or provenance.get("configuration_layer")
                    not in {"node", "persistent", "transient"}
                    or not isinstance(provenance.get("has_deprecated_proxy_setting"), bool)
                    or not isinstance(provenance.get("settings"), dict)
                ):
                    print("CCS restore snapshot is malformed.", file=sys.stderr)
                    return 1
                validate_resource_endpoint(endpoint)
                auth_args = build_auth_args(config)
                if provenance["is_configured_by_node"]:
                    source_url = resolve_resource_base_url(config, "url")
                    request_url = f"{source_url}{endpoint}"
                    request_headers = ["kbn-xsrf: true"]
                    broken_body = _break_payload(payload)
                else:
                    es_url = resolve_resource_base_url(config, "es_url")
                    request_url = f"{es_url}/_cluster/settings"
                    request_headers = []
                    broken_body = _break_settings(
                        alias=args.alias,
                        layer=provenance["configuration_layer"],
                        settings=provenance["settings"],
                        payload=payload,
                        has_deprecated_proxy_setting=provenance[
                            "has_deprecated_proxy_setting"
                        ],
                    )
                header_args: list[str] = []
                for header in request_headers:
                    header_args.extend(["-H", header])

                config["ccs_state"] = "mutation_pending"
                config["ccs_restored"] = False

            result = subprocess.run(
                [
                    "curl",
                    "-s",
                    "-w",
                    "\n%{http_code}",
                    *auth_args,
                    "-X",
                    "PUT",
                    request_url,
                    *header_args,
                    "-H",
                    "Content-Type: application/json",
                    "-d",
                    json.dumps(broken_body, separators=(",", ":")),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            status = http_status(result.stdout)
            if status != "200":
                print(
                    f"CCS break failed (HTTP {status}); mutation remains pending.",
                    file=sys.stderr,
                )
                return 1

            with edit_session_config(config_path) as config:
                if config.get("ccs_state") != "mutation_pending":
                    print(
                        "CCS state changed while the break request was in flight.",
                        file=sys.stderr,
                    )
                    return 1
                config["ccs_state"] = "modified"
                config["ccs_restored"] = False
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Temporarily broke CCS remote cluster {args.alias!r}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
