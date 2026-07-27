#!/usr/bin/env python3
"""Restore and verify a CCS remote cluster from its durable session snapshot."""

import argparse
import copy
import json
import sys
import time
from collections.abc import Callable
from pathlib import Path

from session_resources import (
    DEFAULT_CURL_MAX_TIME_SECONDS,
    assert_ccs_deployment_lease_allows_session,
    build_auth_args,
    ccs_operation_lock,
    edit_session_config,
    read_ccs_deployment_lease,
    refresh_ccs_deployment_lease,
    release_ccs_deployment_lease,
    resolve_resource_base_url,
    run_curl,
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
    parser.add_argument("--timeout-seconds", type=float, default=60.0)
    parser.add_argument("--poll-interval-seconds", type=float, default=2.0)
    parser.add_argument(
        "--keep-lease",
        action="store_true",
        help=(
            "Keep the deployment CCS lease after a successful restore so a "
            "caller can release it after follow-up cleanup."
        ),
    )
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


def _settings_snapshot(settings: object) -> dict[str, object] | None:
    if not isinstance(settings, dict):
        return None
    if not isinstance(settings.get("persistent"), dict) or not isinstance(
        settings.get("transient"), dict
    ):
        return None
    return settings


def _configuration_layer(
    settings: dict[str, object],
    alias: str,
) -> str:
    if _settings_for_alias(settings, layer="transient", alias=alias) is not None:
        return "transient"
    if _settings_for_alias(settings, layer="persistent", alias=alias) is not None:
        return "persistent"
    return "node"


def _settings_update(
    *,
    alias: str,
    settings: dict[str, object],
    clear: bool,
) -> dict[str, object]:
    if clear:
        return {
            "persistent": {"cluster": {"remote": {alias: None}}},
            "transient": {"cluster": {"remote": {alias: None}}},
        }

    update: dict[str, object] = {}
    for layer in ("persistent", "transient"):
        layer_settings = _settings_for_alias(settings, layer=layer, alias=alias)
        if layer_settings is not None:
            update[layer] = {"cluster": {"remote": {alias: layer_settings}}}
    return update


def _validate_snapshot(
    restore: object,
) -> tuple[
    str,
    str,
    dict[str, object],
    dict[str, object],
    dict[str, object],
]:
    if not isinstance(restore, dict):
        raise ValueError("no durable CCS restore snapshot")
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
        or provenance.get("configuration_layer") not in {
            "node",
            "persistent",
            "transient",
        }
        or any(field not in payload for field in RESTORE_FIELDS)
    ):
        raise ValueError("CCS restore snapshot is malformed")
    settings = _settings_snapshot(provenance.get("settings"))
    if settings is None:
        raise ValueError("CCS restore snapshot is malformed")
    expected_layer = "node" if provenance["is_configured_by_node"] else provenance[
        "configuration_layer"
    ]
    if expected_layer != _configuration_layer(settings, alias):
        raise ValueError("CCS restore snapshot provenance is inconsistent")
    validate_resource_endpoint(endpoint)
    return endpoint, alias, payload, provenance, settings


def _parse_json_body(body: str, description: str) -> object:
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid {description}: {exc}") from exc


def _run_curl(
    curl_args: list[str],
    *,
    request_budget: Callable[[], float],
) -> tuple[str, str]:
    max_time_seconds = request_budget()
    if max_time_seconds <= 0:
        raise TimeoutError("CCS restore timed out before the next request")
    try:
        return run_curl(curl_args, max_time_seconds=max_time_seconds)
    except TimeoutError as exc:
        raise TimeoutError("CCS restore timed out waiting for curl") from exc


def _read_raw_settings(
    *,
    auth_args: list[str],
    es_url: str,
    request_budget: Callable[[], float],
) -> tuple[bool, str, dict[str, object] | None]:
    status, body = _run_curl(
        [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            "GET",
            f"{es_url}/_cluster/settings?include_defaults=false",
        ],
        request_budget=request_budget,
    )
    if status != "200":
        return False, f"raw CCS settings check returned HTTP {status}", None
    parsed = _parse_json_body(body, "raw CCS settings response")
    if not isinstance(parsed, dict):
        return False, "raw CCS settings response was not an object", None
    settings = {
        "persistent": parsed.get("persistent", {}),
        "transient": parsed.get("transient", {}),
    }
    if not isinstance(settings["persistent"], dict) or not isinstance(
        settings["transient"], dict
    ):
        return False, "raw CCS settings layers were malformed", None
    return True, "", settings


def _restore_raw_settings(
    *,
    auth_args: list[str],
    es_url: str,
    alias: str,
    settings: dict[str, object],
    request_budget: Callable[[], float],
) -> tuple[bool, str]:
    clear_status, _ = _run_curl(
        [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            "PUT",
            f"{es_url}/_cluster/settings",
            "-H",
            "Content-Type: application/json",
            "-d",
            json.dumps(
                _settings_update(alias=alias, settings=settings, clear=True),
                separators=(",", ":"),
            ),
        ],
        request_budget=request_budget,
    )
    if clear_status != "200":
        return False, f"CCS settings clear failed (HTTP {clear_status})"

    update = _settings_update(alias=alias, settings=settings, clear=False)
    if not update:
        return True, ""
    update_status, _ = _run_curl(
        [
            "curl",
            "-s",
            "-w",
            "\n%{http_code}",
            *auth_args,
            "-X",
            "PUT",
            f"{es_url}/_cluster/settings",
            "-H",
            "Content-Type: application/json",
            "-d",
            json.dumps(update, separators=(",", ":")),
        ],
        request_budget=request_budget,
    )
    if update_status != "200":
        return False, f"CCS settings restore failed (HTTP {update_status})"
    return True, ""


def _cluster_matches_snapshot(
    cluster: dict[str, object],
    payload: dict[str, object],
    provenance: dict[str, object],
) -> bool:
    for field in RESTORE_FIELDS:
        expected = payload.get(field)
        actual = cluster.get(field)
        if actual != expected:
            return False
    if cluster.get("hasDeprecatedProxySetting", False) is not provenance.get(
        "has_deprecated_proxy_setting"
    ):
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
    settings: dict[str, object],
    request_budget: Callable[[], float],
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
        ],
        request_budget=request_budget,
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

    settings_ok, settings_error, actual_settings = _read_raw_settings(
        auth_args=auth_args,
        es_url=es_url,
        request_budget=request_budget,
    )
    if not settings_ok or actual_settings is None:
        return False, settings_error
    for layer in ("persistent", "transient"):
        expected_layer = _settings_for_alias(settings, layer=layer, alias=alias)
        actual_layer = _settings_for_alias(
            actual_settings,
            layer=layer,
            alias=alias,
        )
        if actual_layer != expected_layer:
            return False, f"raw CCS {layer} settings differ from snapshot"

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
        ],
        request_budget=request_budget,
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
    deadline = time.monotonic() + args.timeout_seconds

    def request_budget() -> float:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return 0.0
        return min(DEFAULT_CURL_MAX_TIME_SECONDS, remaining)

    try:
        with ccs_operation_lock(config_path):
            with edit_session_config(config_path, persist=False) as config:
                assert_ccs_deployment_lease_allows_session(config)
                if read_ccs_deployment_lease(config) is not None:
                    refresh_ccs_deployment_lease(config)
                restore_snapshot = copy.deepcopy(config.get("ccs_restore"))
                endpoint, alias, payload, provenance, settings = _validate_snapshot(
                    restore_snapshot
                )
                initial_state = config.get("ccs_state")
                auth_args = build_auth_args(config)
                source_url = resolve_resource_base_url(config, "url")
                es_url = resolve_resource_base_url(config, "es_url")

            should_verify_before_restore = initial_state in {
                "unchanged",
                "captured",
                "mutation_pending",
                "restored",
            }
            if should_verify_before_restore:
                verified, _ = _verify_restored_cluster(
                    auth_args=auth_args,
                    source_url=source_url,
                    es_url=es_url,
                    alias=alias,
                    payload=payload,
                    provenance=provenance,
                    settings=settings,
                    request_budget=request_budget,
                )
            else:
                verified = False

            if not verified:
                # Re-check ownership immediately before mutating shared CCS.
                with edit_session_config(config_path, persist=False) as config:
                    assert_ccs_deployment_lease_allows_session(config)
                    if read_ccs_deployment_lease(config) is not None:
                        refresh_ccs_deployment_lease(config)
                restored, restore_error = _restore_raw_settings(
                    auth_args=auth_args,
                    es_url=es_url,
                    alias=alias,
                    settings=settings,
                    request_budget=request_budget,
                )
                if not restored:
                    print(restore_error, file=sys.stderr)
                    return 1

            last_error = "verification did not run"
            while True:
                verified, error = _verify_restored_cluster(
                    auth_args=auth_args,
                    source_url=source_url,
                    es_url=es_url,
                    alias=alias,
                    payload=payload,
                    provenance=provenance,
                    settings=settings,
                    request_budget=request_budget,
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

            with edit_session_config(config_path) as config:
                if config.get("ccs_restore") != restore_snapshot:
                    print(
                        "CCS restore snapshot changed while restoration was in flight.",
                        file=sys.stderr,
                    )
                    return 1
                if config.get("ccs_state") not in {
                    "unchanged",
                    "captured",
                    "mutation_pending",
                    "modified",
                    "restored",
                    None,
                }:
                    print(
                        "CCS state changed while restoration was in flight.",
                        file=sys.stderr,
                    )
                    return 1
                # Persist restored state even if the lease was stolen mid-flight;
                # never fail the command after a successful remote restore solely
                # because lease release is no longer owned.
                config["ccs_state"] = "restored"
                config["ccs_restored"] = True
            if not args.keep_lease:
                with edit_session_config(config_path, persist=False) as config:
                    release_ccs_deployment_lease(config, require_owner=False)
    except TimeoutError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Restored and verified CCS remote cluster {alias!r}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
