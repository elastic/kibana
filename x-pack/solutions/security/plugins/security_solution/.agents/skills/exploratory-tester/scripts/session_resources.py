#!/usr/bin/env python3
"""Shared session resource ownership and authentication helpers."""

from __future__ import annotations

import re
import secrets
from typing import Any


SESSION_ID_PATTERN = re.compile(r"^[a-z0-9]{8,32}$")
RESOURCE_MARKER_PREFIX = "exploratory-tester:"
RESOURCE_KINDS = frozenset(
    {
        "kibana_space",
        "es_index",
        "kibana_user",
        "kibana_role",
        "connector",
        "detection_rule",
        "ccs_remote_cluster",
        "ccs_remote_cluster_snapshot",
    }
)


def validate_session_id(session_id: str) -> str:
    if not isinstance(session_id, str) or not SESSION_ID_PATTERN.fullmatch(session_id):
        raise ValueError(
            "session_id must contain 8-32 lowercase ASCII letters or digits"
        )
    return session_id


def ensure_session_manifest(
    config: dict[str, Any],
    session_id: str | None = None,
) -> str:
    configured_id = config.get("session_id")
    if (
        configured_id is not None
        and session_id is not None
        and configured_id != session_id
    ):
        raise ValueError(
            "Configured session_id does not match the requested session_id"
        )

    resolved_id = session_id or configured_id or secrets.token_hex(8)
    validate_session_id(resolved_id)
    config["session_id"] = resolved_id
    for field in ("session_resources", "created_flow_spaces", "reused_flow_spaces"):
        value = config.setdefault(field, [])
        if not isinstance(value, list):
            raise ValueError(f"Session config field {field!r} must be a list")
    return resolved_id


def resource_marker(session_id: str) -> str:
    return f"{RESOURCE_MARKER_PREFIX}{validate_session_id(session_id)}"


def require_session_id(config: dict[str, Any]) -> str:
    session_id = config.get("session_id")
    if not isinstance(session_id, str):
        raise ValueError("Session config is missing session_id")
    return validate_session_id(session_id)


def namespaced_flow_space_id(session_id: str, flow_number: int) -> str:
    if flow_number < 1:
        raise ValueError("flow_number must be positive")
    return f"exploratory-testing-{validate_session_id(session_id)}-flow-{flow_number}"


def validate_resource_endpoint(endpoint: str) -> str:
    if (
        not isinstance(endpoint, str)
        or not endpoint.startswith("/")
        or "://" in endpoint
        or ".." in endpoint
        or any(character in endpoint for character in ("*", "#", "\x00", "\n", "\r"))
    ):
        raise ValueError("Resource cleanup endpoints must be safe relative paths")
    return endpoint


def build_auth_args(config: dict[str, Any]) -> list[str]:
    environment = config.get("environment", {})
    credentials = config.get("credentials", {})
    environment_type = environment.get("type")
    api_key = credentials.get("api_key")

    if api_key:
        return ["-H", f"Authorization: ApiKey {api_key}"]

    if environment_type == "user-provided":
        raise ValueError(
            "User-provided environments require credentials.api_key for API calls"
        )

    username = credentials.get("username", "elastic")
    password = credentials.get("password", "changeme")
    return ["-u", f"{username}:{password}"]


def register_resource(
    config: dict[str, Any],
    *,
    kind: str,
    resource_id: str,
    owned: bool,
    endpoint: str,
    method: str = "DELETE",
    protected: bool = False,
    base_url: str = "url",
    track_flow_space: bool = True,
) -> dict[str, Any]:
    if kind not in RESOURCE_KINDS:
        raise ValueError(f"Unsupported session resource kind: {kind}")
    validate_resource_endpoint(endpoint)
    if not isinstance(resource_id, str) or not resource_id:
        raise ValueError("Session resource ids must be non-empty strings")
    session_id = ensure_session_manifest(config)
    if (
        kind == "kibana_space"
        and owned
        and not protected
        and not resource_id.startswith(f"exploratory-testing-{session_id}-flow-")
    ):
        raise ValueError(
            "Owned non-protected Kibana spaces must use the session namespace"
        )
    marker = resource_marker(session_id) if owned else None
    resource = {
        "kind": kind,
        "id": resource_id,
        "owned": owned,
        "marker": marker,
        "endpoint": endpoint,
        "method": method,
        "protected": protected,
        "base_url": base_url,
    }
    resources = config["session_resources"]
    resources[:] = [
        existing
        for existing in resources
        if not (
            existing.get("kind") == kind
            and existing.get("id") == resource_id
        )
    ]
    resources.append(resource)

    if kind == "kibana_space" and track_flow_space:
        target = config["created_flow_spaces"] if owned else config["reused_flow_spaces"]
        if resource_id not in target:
            target.append(resource_id)
        other_target = (
            config["reused_flow_spaces"] if owned else config["created_flow_spaces"]
        )
        if resource_id in other_target:
            other_target.remove(resource_id)

    return resource


def cleanup_candidates(config: dict[str, Any]) -> list[dict[str, Any]]:
    session_id = require_session_id(config)
    expected_marker = resource_marker(session_id)
    resources = config.get("session_resources")
    if not isinstance(resources, list) or not all(
        isinstance(resource, dict) for resource in resources
    ):
        raise ValueError(
            "Session config field 'session_resources' must be a list of objects"
        )
    return [
        resource
        for resource in resources
        if resource.get("owned") is True
        and resource.get("marker") == expected_marker
        and resource.get("protected") is not True
        and (
            resource.get("kind") != "kibana_space"
            or str(resource.get("id", "")).startswith(
                f"exploratory-testing-{session_id}-flow-"
            )
        )
    ]
