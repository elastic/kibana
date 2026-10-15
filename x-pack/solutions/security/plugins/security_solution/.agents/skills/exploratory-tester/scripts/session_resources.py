#!/usr/bin/env python3
"""Shared session resource ownership and authentication helpers."""

from __future__ import annotations

# The exploratory-tester runtime is Unix-only; fcntl gives process-safe locks.
import fcntl
import hashlib
import json
import os
import re
import secrets
import subprocess
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Mapping

DEFAULT_CURL_CONNECT_TIMEOUT_SECONDS = 10.0
DEFAULT_CURL_MAX_TIME_SECONDS = 30.0
DEFAULT_CCS_LEASE_TTL_SECONDS = 4 * 60 * 60
CCS_LOCK_DIR_ENV = "EXPLORATORY_TESTER_CCS_LOCK_DIR"
# A fixed shared location so the lease is deployment-scoped rather than
# per-$TMPDIR. Override with CCS_LOCK_DIR_ENV.
DEFAULT_CCS_LOCK_DIR = Path("/tmp/exploratory-tester")
CCS_LEASE_TTL_ENV = "EXPLORATORY_TESTER_CCS_LEASE_TTL_SECONDS"
CURL_CONNECT_TIMEOUT_ENV = "EXPLORATORY_TESTER_CURL_CONNECT_TIMEOUT"
CURL_MAX_TIME_ENV = "EXPLORATORY_TESTER_CURL_MAX_TIME"


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
        "es_alerts",
        "ccs_remote_cluster",
        "ccs_remote_cluster_snapshot",
    }
)
RESOURCE_STATES = frozenset({"pending", "owned", "reused"})
RESOURCE_PRESENT_STATUSES = frozenset({"200", "201", "204"})
CCS_STATES = frozenset(
    {"unchanged", "captured", "mutation_pending", "modified", "restored"}
)


def load_session_config(config_path: Path) -> dict[str, Any]:
    with config_path.open(encoding="utf-8") as config_file:
        config = json.load(config_file)
    if not isinstance(config, dict):
        raise ValueError("Session config must be a JSON object")
    return config


def write_session_config(config_path: Path, config: dict[str, Any]) -> None:
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=config_path.parent,
            prefix=f".{config_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as config_file:
            temporary_path = Path(config_file.name)
            json.dump(config, config_file, indent=2)
            config_file.write("\n")
            config_file.flush()
            os.fsync(config_file.fileno())
        os.replace(temporary_path, config_path)
        temporary_path = None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


@contextmanager
def edit_session_config(
    config_path: Path,
    *,
    persist: bool = True,
) -> Iterator[dict[str, Any]]:
    lock_path = config_path.with_name(f".{config_path.name}.lock")
    with lock_path.open("a+", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        config = load_session_config(config_path)
        try:
            yield config
            if persist:
                write_session_config(config_path, config)
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


@contextmanager
def session_operation_lock(
    config_path: Path,
    operation: str,
) -> Iterator[None]:
    if not re.fullmatch(r"[a-z0-9-]+", operation):
        raise ValueError("Session operation lock name is invalid")
    lock_path = config_path.with_name(f".{config_path.name}.{operation}.lock")
    with lock_path.open("a+", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


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


def build_auth_args(
    config: dict[str, Any],
    *,
    base_url_key: str = "url",
) -> list[str]:
    environment = config.get("environment", {})
    using_remote_credentials = base_url_key == "ccs_remote_es_url"
    if using_remote_credentials:
        ccs = environment.get("ccs", {})
        remote = ccs.get("remote", {}) if isinstance(ccs, dict) else {}
        credentials = remote.get("credentials") if isinstance(remote, dict) else None
        if not isinstance(credentials, dict):
            raise ValueError(
                "CCS remote credentials are required for remote cleanup"
            )
    else:
        credentials = config.get("credentials", {})
        if credentials is None:
            credentials = {}
    if not isinstance(credentials, dict):
        raise ValueError("Session config field 'credentials' must be an object")
    environment_type = environment.get("type")
    api_key = credentials.get("api_key")

    if api_key:
        return ["-H", f"Authorization: ApiKey {api_key}"]

    # Source user-provided and serverless deployments require a Kibana API key;
    # Phase 1 refuses to run setup without one, so cleanup must not silently
    # fall back to basic auth. Remote CCS credentials are independent and may
    # use basic auth on a managed remote.
    if not using_remote_credentials and environment_type in {
        "user-provided",
        "serverless",
    }:
        raise ValueError(
            f"{environment_type} environments require credentials.api_key "
            "for API calls"
        )

    username = credentials.get("username", "elastic")
    password = credentials.get("password", "changeme")
    return ["-u", f"{username}:{password}"]


def resolve_resource_base_url(
    config: dict[str, Any],
    base_url_key: str,
) -> str:
    environment = config.get("environment", {})
    if base_url_key == "ccs_remote_es_url":
        ccs = environment.get("ccs", {})
        remote = ccs.get("remote", {}) if isinstance(ccs, dict) else {}
        base_url = remote.get("es_url") if isinstance(remote, dict) else None
    else:
        base_url = environment.get(base_url_key)
    if not isinstance(base_url, str) or not base_url:
        raise ValueError(f"Environment is missing {base_url_key!r}")
    return base_url


def http_status(stdout: str) -> str:
    lines = stdout.strip().splitlines()
    return lines[-1].strip() if lines else "000"


def _response_body(stdout: str) -> str:
    lines = stdout.strip().splitlines()
    return "\n".join(lines[:-1]) if len(lines) > 1 else ""


def _timeout_from_env(
    *,
    explicit: float | None,
    env_name: str,
    default: float,
    environment: Mapping[str, str],
) -> float:
    if explicit is not None:
        return explicit
    raw = environment.get(env_name)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise ValueError(f"{env_name} must be a positive number") from exc


def run_curl(
    curl_args: list[str],
    *,
    connect_timeout_seconds: float | None = None,
    max_time_seconds: float | None = None,
    env: Mapping[str, str] | None = None,
) -> tuple[str, str]:
    environment = env if env is not None else os.environ
    resolved_connect = _timeout_from_env(
        explicit=connect_timeout_seconds,
        env_name=CURL_CONNECT_TIMEOUT_ENV,
        default=DEFAULT_CURL_CONNECT_TIMEOUT_SECONDS,
        environment=environment,
    )
    resolved_max_time = _timeout_from_env(
        explicit=max_time_seconds,
        env_name=CURL_MAX_TIME_ENV,
        default=DEFAULT_CURL_MAX_TIME_SECONDS,
        environment=environment,
    )
    if resolved_connect <= 0 or resolved_max_time <= 0:
        raise ValueError("curl timeouts must be positive")
    if not curl_args:
        raise ValueError("curl args must not be empty")

    timeout_flags = [
        "--connect-timeout",
        f"{resolved_connect:g}",
        "--max-time",
        f"{resolved_max_time:g}",
    ]
    if curl_args[0] == "curl":
        args = ["curl", *timeout_flags, *curl_args[1:]]
    else:
        args = ["curl", *timeout_flags, *curl_args]

    subprocess_timeout = resolved_max_time + 1.0
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            check=False,
            timeout=subprocess_timeout,
            env=None if env is None else dict(env),
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(
            f"curl exceeded max_time_seconds={resolved_max_time:g}"
        ) from exc
    return http_status(result.stdout), _response_body(result.stdout)


def _normalize_deployment_url(url: str) -> str:
    return url.strip().rstrip("/")


def ccs_deployment_lock_path(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
) -> Path:
    environment = env if env is not None else os.environ
    lock_dir_value = environment.get(CCS_LOCK_DIR_ENV)
    # Deliberately not tempfile.gettempdir(): it honours $TMPDIR, so two
    # sessions with different TMPDIR values would take different lease files
    # for the same deployment and both proceed to mutate it.
    lock_dir = (
        Path(lock_dir_value) if lock_dir_value else DEFAULT_CCS_LOCK_DIR
    )
    lock_dir.mkdir(parents=True, exist_ok=True)
    es_url = resolve_resource_base_url(config, "es_url")
    digest = hashlib.sha256(_normalize_deployment_url(es_url).encode()).hexdigest()[
        :32
    ]
    return lock_dir / f"exploratory-tester-ccs-{digest}.lock"


@contextmanager
def ccs_deployment_lock(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
) -> Iterator[None]:
    lock_path = ccs_deployment_lock_path(config, env=env)
    with lock_path.open("a+", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


@contextmanager
def ccs_operation_lock(config_path: Path) -> Iterator[None]:
    """Serialize CCS mutations across sessions for the same deployment."""
    with edit_session_config(config_path, persist=False) as config:
        deployment_config = {
            "environment": {
                "es_url": resolve_resource_base_url(config, "es_url"),
            }
        }
    with ccs_deployment_lock(deployment_config):
        with session_operation_lock(config_path, "ccs-restore"):
            yield


def ccs_deployment_lease_path(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
) -> Path:
    return ccs_deployment_lock_path(config, env=env).with_suffix(".lease")


def ccs_deployment_lease_ttl_seconds(
    *,
    env: Mapping[str, str] | None = None,
) -> float:
    environment = env if env is not None else os.environ
    raw = environment.get(CCS_LEASE_TTL_ENV)
    if raw is None or raw == "":
        return float(DEFAULT_CCS_LEASE_TTL_SECONDS)
    try:
        ttl = float(raw)
    except ValueError as exc:
        raise ValueError(f"{CCS_LEASE_TTL_ENV} must be a positive number") from exc
    if ttl <= 0:
        raise ValueError(f"{CCS_LEASE_TTL_ENV} must be a positive number")
    return ttl


def ccs_deployment_lease_is_expired(
    lease: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
    now: float | None = None,
) -> bool:
    acquired_at = lease.get("acquired_at")
    if not isinstance(acquired_at, (int, float)):
        return True
    current = time.time() if now is None else now
    return current - float(acquired_at) > ccs_deployment_lease_ttl_seconds(env=env)


def read_ccs_deployment_lease(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
) -> dict[str, Any] | None:
    lease_path = ccs_deployment_lease_path(config, env=env)
    if not lease_path.exists():
        return None
    try:
        payload = json.loads(lease_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("CCS deployment lease is malformed") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("session_id"), str):
        raise ValueError("CCS deployment lease is malformed")
    validate_session_id(payload["session_id"])
    return payload


def _write_ccs_deployment_lease(
    config: dict[str, Any],
    *,
    session_id: str,
    env: Mapping[str, str] | None = None,
) -> None:
    lease_path = ccs_deployment_lease_path(config, env=env)
    payload = {
        "session_id": session_id,
        "acquired_at": time.time(),
    }
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=lease_path.parent,
            prefix=f".{lease_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as lease_file:
            temporary_path = Path(lease_file.name)
            json.dump(payload, lease_file)
            lease_file.write("\n")
            lease_file.flush()
            os.fsync(lease_file.fileno())
        os.replace(temporary_path, lease_path)
        temporary_path = None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def acquire_ccs_deployment_lease(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
    force: bool = False,
) -> None:
    """Acquire or refresh the deployment CCS lease.

    Foreign leases always block by default, including after TTL expiry, so a
    long exploration window cannot be stolen by another session's break.
    Pass force=True only for explicit crash-recovery takeover of an *expired*
    foreign lease (never an active/unexpired one).
    """
    session_id = require_session_id(config)
    existing = read_ccs_deployment_lease(config, env=env)
    if existing is not None:
        owner = existing["session_id"]
        if owner == session_id:
            _write_ccs_deployment_lease(config, session_id=session_id, env=env)
            return
        expired = ccs_deployment_lease_is_expired(existing, env=env)
        if force and expired:
            _write_ccs_deployment_lease(config, session_id=session_id, env=env)
            return
        raise ValueError(
            f"CCS deployment lease is held by session {owner!r}"
            + (
                "; pass force=True / --force-lease only if that session is dead "
                "and its lease is expired"
                if expired
                else ""
            )
        )
    _write_ccs_deployment_lease(config, session_id=session_id, env=env)


def assert_ccs_deployment_lease_allows_session(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
) -> None:
    """Refuse foreign leases even when expired."""
    session_id = require_session_id(config)
    existing = read_ccs_deployment_lease(config, env=env)
    if existing is None:
        return
    owner = existing["session_id"]
    if owner != session_id:
        raise ValueError(f"CCS deployment lease is held by session {owner!r}")


def refresh_ccs_deployment_lease(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
) -> None:
    """Heartbeat: refresh acquired_at for the owning session only."""
    session_id = require_session_id(config)
    existing = read_ccs_deployment_lease(config, env=env)
    if existing is None:
        raise ValueError("CCS deployment lease is missing")
    owner = existing["session_id"]
    if owner != session_id:
        raise ValueError(f"CCS deployment lease is held by session {owner!r}")
    _write_ccs_deployment_lease(config, session_id=session_id, env=env)


def release_ccs_deployment_lease(
    config: dict[str, Any],
    *,
    env: Mapping[str, str] | None = None,
    require_owner: bool = True,
) -> bool:
    """Release the deployment lease when owned by this session.

    Returns True when a lease file was removed. When require_owner is False,
    foreign leases are left untouched and False is returned instead of raising.
    """
    session_id = require_session_id(config)
    existing = read_ccs_deployment_lease(config, env=env)
    if existing is None:
        return False
    owner = existing["session_id"]
    if owner != session_id:
        if require_owner:
            raise ValueError(
                f"Cannot release CCS deployment lease held by session {owner!r}"
            )
        return False
    ccs_deployment_lease_path(config, env=env).unlink(missing_ok=True)
    return True


def resource_state(resource: dict[str, Any]) -> str:
    state = resource.get("state")
    if state in RESOURCE_STATES:
        return state
    return "owned" if resource.get("owned") is True else "reused"


def _find_resource(
    config: dict[str, Any],
    *,
    kind: str,
    resource_id: str,
) -> dict[str, Any] | None:
    resources = config.get("session_resources")
    if not isinstance(resources, list):
        return None
    return next(
        (
            resource
            for resource in resources
            if isinstance(resource, dict)
            and resource.get("kind") == kind
            and resource.get("id") == resource_id
        ),
        None,
    )


def is_owned_resource(
    config: dict[str, Any],
    *,
    kind: str,
    resource_id: str,
) -> bool:
    session_id = require_session_id(config)
    resources = config.get("session_resources")
    if not isinstance(resources, list):
        return False
    expected_marker = resource_marker(session_id)
    return any(
        isinstance(resource, dict)
        and resource.get("kind") == kind
        and resource.get("id") == resource_id
        and resource_state(resource) == "owned"
        and resource.get("owned") is True
        and resource.get("marker") == expected_marker
        for resource in resources
    )


def is_pending_resource(
    config: dict[str, Any],
    *,
    kind: str,
    resource_id: str,
) -> bool:
    session_id = require_session_id(config)
    resource = _find_resource(config, kind=kind, resource_id=resource_id)
    return bool(
        resource
        and resource_state(resource) == "pending"
        and resource.get("marker") == resource_marker(session_id)
    )


def pending_resources(config: dict[str, Any]) -> list[dict[str, Any]]:
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
        if resource_state(resource) == "pending"
        and resource.get("marker") == expected_marker
    ]


def ccs_cleanup_blocked(config: dict[str, Any]) -> bool:
    environment = config.get("environment", {})
    ccs = environment.get("ccs") if isinstance(environment, dict) else None
    state = config.get("ccs_state")
    snapshot_present = isinstance(config.get("ccs_restore"), dict)
    # "captured" is provably pre-mutation: break-remote-cluster.py journals
    # "mutation_pending" before it issues the request, so a session still at
    # "captured" has nothing to restore and must not be blocked from cleaning
    # up its own unrelated resources.
    if not isinstance(ccs, dict) or not ccs:
        if state in {"restored", "captured"}:
            return False
        return snapshot_present or state in {
            "mutation_pending",
            "modified",
        }
    if state is not None:
        if state not in CCS_STATES:
            return True
        if state in {"mutation_pending", "modified"}:
            return True
        if state == "unchanged" and snapshot_present:
            return True
        return False
    return (
        config.get("ccs_restored") is not True
        or isinstance(config.get("ccs_restore"), dict)
    )


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
    body: str | None = None,
    state: str | None = None,
    allow_pending_downgrade: bool = False,
) -> dict[str, Any]:
    if kind not in RESOURCE_KINDS:
        raise ValueError(f"Unsupported session resource kind: {kind}")
    validate_resource_endpoint(endpoint)
    if not isinstance(resource_id, str) or not resource_id:
        raise ValueError("Session resource ids must be non-empty strings")
    if method not in {"DELETE", "POST"}:
        raise ValueError(f"Unsupported cleanup method: {method}")
    if state is not None and state not in RESOURCE_STATES:
        raise ValueError(f"Unsupported session resource state: {state}")
    session_id = ensure_session_manifest(config)
    existing = _find_resource(config, kind=kind, resource_id=resource_id)
    resolved_state = state or ("owned" if owned else "reused")
    if (
        resolved_state == "reused"
        and existing
        and existing.get("marker") == resource_marker(session_id)
    ):
        existing_state = resource_state(existing)
        if existing_state == "owned":
            resolved_state = "owned"
        elif existing_state == "pending" and not allow_pending_downgrade:
            # Downgrading clears the marker, dropping the resource from both
            # pending_resources() and cleanup_candidates(). Only a caller that
            # has confirmed the resource pre-existed this session may do it.
            raise ValueError(
                f"Refusing to discard the pending reservation for {kind} "
                f"{resource_id!r}: pass allow_pending_downgrade only after "
                "confirming the resource existed before this session reserved it"
            )
    if resolved_state == "owned":
        owned = True
    elif resolved_state in {"pending", "reused"}:
        owned = False
    if (
        kind == "kibana_space"
        and owned
        and not protected
        and not resource_id.startswith(f"exploratory-testing-{session_id}-flow-")
    ):
        raise ValueError(
            "Owned non-protected Kibana spaces must use the session namespace"
        )
    marker = (
        resource_marker(session_id)
        if resolved_state in {"pending", "owned"}
        else None
    )
    resource = {
        "kind": kind,
        "id": resource_id,
        "owned": owned,
        "state": resolved_state,
        "marker": marker,
        "endpoint": endpoint,
        "method": method,
        "protected": protected,
        "base_url": base_url,
    }
    if body is not None:
        resource["body"] = body
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

    if (
        kind == "kibana_space"
        and track_flow_space
        and resolved_state in {"owned", "reused"}
    ):
        target = config["created_flow_spaces"] if owned else config["reused_flow_spaces"]
        if resource_id not in target:
            target.append(resource_id)
        other_target = (
            config["reused_flow_spaces"] if owned else config["created_flow_spaces"]
        )
        if resource_id in other_target:
            other_target.remove(resource_id)

    return resource


def remove_pending_resource(
    config: dict[str, Any],
    *,
    kind: str,
    resource_id: str,
) -> bool:
    resource = _find_resource(config, kind=kind, resource_id=resource_id)
    if resource is None or resource_state(resource) != "pending":
        return False
    resources = config["session_resources"]
    resources[:] = [
        existing
        for existing in resources
        if not (
            existing.get("kind") == kind
            and existing.get("id") == resource_id
            and resource_state(existing) == "pending"
        )
    ]
    return True


def reconcile_pending_resource(
    config: dict[str, Any],
    *,
    kind: str,
    resource_id: str,
    endpoint: str,
    http_code: str,
    method: str = "DELETE",
    protected: bool = False,
    base_url: str = "url",
    track_flow_space: bool = False,
    body: str | None = None,
) -> str:
    if not is_pending_resource(config, kind=kind, resource_id=resource_id):
        raise ValueError(
            f"Session resource {kind} {resource_id!r} is not pending"
        )
    if http_code in RESOURCE_PRESENT_STATUSES:
        existing = _find_resource(config, kind=kind, resource_id=resource_id)
        pending = existing if isinstance(existing, dict) else {}
        pending_method = pending.get("method")
        pending_body = pending.get("body")
        pending_protected = pending.get("protected")
        pending_base_url = pending.get("base_url")
        pending_endpoint = pending.get("endpoint")
        register_resource(
            config,
            kind=kind,
            resource_id=resource_id,
            owned=True,
            endpoint=(
                pending_endpoint
                if isinstance(pending_endpoint, str) and pending_endpoint
                else endpoint
            ),
            method=(
                pending_method
                if pending_method in {"DELETE", "POST"}
                else method
            ),
            protected=(
                bool(pending_protected)
                if "protected" in pending
                else protected
            ),
            base_url=(
                pending_base_url
                if pending_base_url
                in {"url", "es_url", "ccs_remote_es_url"}
                else base_url
            ),
            track_flow_space=track_flow_space,
            body=pending_body if isinstance(pending_body, str) else body,
            state="owned",
        )
        return "owned"
    if http_code == "404":
        remove_pending_resource(config, kind=kind, resource_id=resource_id)
        return "removed"
    return "pending"


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
        if resource_state(resource) == "owned"
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
