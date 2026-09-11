#!/usr/bin/env python3
"""Persist a writable CCS remote-cluster snapshot for later restoration."""

import argparse
import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import quote

from session_resources import (
    assert_ccs_deployment_lease_allows_session,
    build_auth_args,
    ccs_operation_lock,
    edit_session_config,
    read_ccs_deployment_lease,
    refresh_ccs_deployment_lease,
    run_curl,
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
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-dir", required=True)
    parser.add_argument("--alias", required=True)
    return parser.parse_args()


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


def _settings_for_alias(
    payload: object,
    *,
    layer: str,
    alias: str,
) -> dict[str, object] | None:
    if not isinstance(payload, dict):
        return None
    layer_payload = payload.get(layer)
    if not isinstance(layer_payload, dict):
        return None
    cluster_payload = layer_payload.get("cluster")
    if not isinstance(cluster_payload, dict):
        return None
    remote_payload = cluster_payload.get("remote")
    if not isinstance(remote_payload, dict):
        return None
    alias_settings = remote_payload.get(alias)
    return alias_settings if isinstance(alias_settings, dict) else None


def _settings_snapshot(
    payload: object,
    *,
    alias: str,
) -> tuple[dict[str, object], str]:
    persistent = _settings_for_alias(payload, layer="persistent", alias=alias)
    transient = _settings_for_alias(payload, layer="transient", alias=alias)
    settings = {
        "persistent": (
            {
                "cluster": {
                    "remote": {
                        alias: persistent,
                    }
                }
            }
            if persistent is not None
            else {}
        ),
        "transient": (
            {
                "cluster": {
                    "remote": {
                        alias: transient,
                    }
                }
            }
            if transient is not None
            else {}
        ),
    }
    if transient is not None:
        configuration_layer = "transient"
    elif persistent is not None:
        configuration_layer = "persistent"
    else:
        configuration_layer = "node"
    return settings, configuration_layer


def _read_capture_view(
    *,
    alias: str,
    auth_args: list[str],
    source_url: str,
    es_url: str,
    collection_endpoint: str,
) -> dict[str, Any]:
    status, body = run_curl(
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
    if status != "200":
        raise ValueError(
            f"Unable to capture remote cluster {alias!r} (HTTP {status})."
        )
    try:
        response_payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid remote-cluster response: {exc}") from exc

    cluster = _find_cluster(response_payload, alias)
    if cluster is None:
        raise ValueError(f"Remote cluster {alias!r} was not found in the response.")

    is_configured_by_node = cluster.get("isConfiguredByNode")
    has_deprecated_proxy_setting = cluster.get("hasDeprecatedProxySetting", False)
    if (
        not isinstance(cluster.get("mode"), str)
        or not isinstance(cluster.get("skipUnavailable"), bool)
        or not isinstance(is_configured_by_node, bool)
        or not isinstance(has_deprecated_proxy_setting, bool)
    ):
        raise ValueError(
            "Remote-cluster response is missing required writable or provenance "
            "fields."
        )

    settings_status, settings_body = run_curl(
        [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            "GET",
            f"{es_url}/_cluster/settings?include_defaults=false",
        ]
    )
    if settings_status != "200":
        raise ValueError(
            f"Unable to capture raw CCS settings (HTTP {settings_status})."
        )
    try:
        settings_response = json.loads(settings_body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid raw CCS settings response: {exc}") from exc
    if not isinstance(settings_response, dict) or not isinstance(
        settings_response.get("persistent", {}),
        dict,
    ) or not isinstance(settings_response.get("transient", {}), dict):
        raise ValueError("Raw CCS settings response has malformed layers.")

    settings, configuration_layer = _settings_snapshot(
        settings_response,
        alias=alias,
    )
    persistent_settings = _settings_for_alias(
        settings_response,
        layer="persistent",
        alias=alias,
    )
    transient_settings = _settings_for_alias(
        settings_response,
        layer="transient",
        alias=alias,
    )
    if is_configured_by_node and (
        persistent_settings is not None or transient_settings is not None
    ):
        raise ValueError(
            "CCS provenance disagrees with raw persistent/transient settings."
        )
    if not is_configured_by_node and (
        persistent_settings is None and transient_settings is None
    ):
        raise ValueError(
            "CCS response is not node-configured but has no raw settings layer."
        )

    payload = {field: cluster.get(field) for field in RESTORE_FIELDS}
    return {
        "payload": payload,
        "is_configured_by_node": is_configured_by_node,
        "has_deprecated_proxy_setting": has_deprecated_proxy_setting,
        "configuration_layer": configuration_layer,
        "settings": settings,
    }


def main() -> int:
    args = parse_args()
    config_path = Path(args.session_dir) / "config.json"

    try:
        with ccs_operation_lock(config_path):
            with edit_session_config(config_path, persist=False) as config:
                if config.get("ccs_state") in {"mutation_pending", "modified"}:
                    print(
                        "Cannot capture CCS while a prior mutation is pending or "
                        "modified.",
                        file=sys.stderr,
                    )
                    return 1
                assert_ccs_deployment_lease_allows_session(config)
                if read_ccs_deployment_lease(config) is not None:
                    refresh_ccs_deployment_lease(config)
                auth_args = build_auth_args(config)
                source_url = resolve_resource_base_url(config, "url")
                es_url = resolve_resource_base_url(config, "es_url")
                collection_endpoint = validate_resource_endpoint(
                    "/api/remote_clusters"
                )
                endpoint = validate_resource_endpoint(
                    f"/api/remote_clusters/{quote(args.alias, safe='')}"
                )

            first_view = _read_capture_view(
                alias=args.alias,
                auth_args=auth_args,
                source_url=source_url,
                es_url=es_url,
                collection_endpoint=collection_endpoint,
            )
            second_view = _read_capture_view(
                alias=args.alias,
                auth_args=auth_args,
                source_url=source_url,
                es_url=es_url,
                collection_endpoint=collection_endpoint,
            )
            if first_view != second_view:
                print(
                    "Remote cluster configuration changed during capture; "
                    "refusing to persist an inconsistent snapshot.",
                    file=sys.stderr,
                )
                return 1

            with edit_session_config(config_path) as config:
                if config.get("ccs_state") in {"mutation_pending", "modified"}:
                    print(
                        "Cannot capture CCS while a prior mutation is pending or "
                        "modified.",
                        file=sys.stderr,
                    )
                    return 1
                config["ccs_restore"] = {
                    "remote_cluster_alias": args.alias,
                    "endpoint": endpoint,
                    "payload": first_view["payload"],
                    "provenance": {
                        "is_configured_by_node": first_view["is_configured_by_node"],
                        "has_deprecated_proxy_setting": first_view[
                            "has_deprecated_proxy_setting"
                        ],
                        "configuration_layer": first_view["configuration_layer"],
                        "settings": first_view["settings"],
                    },
                }
                config["ccs_state"] = "captured"
                config["ccs_restored"] = False
    except TimeoutError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Persisted CCS restore snapshot for {args.alias!r}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
