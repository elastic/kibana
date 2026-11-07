"""Bounded evidence and generation-pinned Storage operations for the demo."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import quote


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def encoded(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def verified_principal(claims: dict, audiences: list[str]) -> dict:
    """Claims must have passed Google signature/expiry verification first."""
    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("unexpected_issuer")
    if not audiences or claims.get("aud") not in audiences:
        raise ValueError("unexpected_audience")
    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject or len(subject) > 255:
        raise ValueError("missing_subject")
    email = claims.get("email")
    if not isinstance(email, str) or claims.get("email_verified") is not True or len(email) > 320:
        email = None
    return {
        "subject": subject,
        "email": email,
        "issuer": claims["iss"],
        "audience": claims["aud"],
        "principal_type": "service_account" if email and email.endswith(".gserviceaccount.com") else "google_account",
        "authenticated": True,
        "provenance": "google_signed_id_token_verified_by_application",
        "human_identity": "account_level_only",
    }


def policy_matches(policy: dict, tool_name: str) -> list[dict]:
    if policy.get("mode") != "monitor":
        raise ValueError("only_monitor_policy_supported")
    return [
        {
            "policy_id": policy["id"], "policy_name": policy["name"],
            "policy_revision": policy["revision"], "policy_sha256": sha256(encoded(policy)),
            "rule_id": rule["id"], "severity": rule["severity"],
            "title": rule["title"], "reason": rule["reason"],
            "mode": "monitor", "decision": "record_and_continue", "enforced": False,
        }
        for rule in policy["rules"] if rule["tool"] == tool_name
    ]


class StorageError(Exception):
    """Safe error code only: never include HTTP bodies or authorization headers."""

    def __init__(self, code: str, *, http_status: int | None = None,
                 operation: str | None = None, target: dict | None = None):
        super().__init__(code)
        self.http_status = http_status
        self.operation = operation
        self.target = target


class Storage:
    def __init__(self, session):
        self.session = session

    @staticmethod
    def headers(run_id: str, trace_id: str, call_id: str) -> dict:
        return {
            "x-goog-custom-audit-ei-run": run_id,
            "x-goog-custom-audit-ei-trace": trace_id,
            "x-goog-custom-audit-ei-tool": call_id[:200],
        }

    def read_json(self, bucket: str, object_name: str, headers: dict, max_bytes=16384, timeout=20) -> tuple[dict, dict]:
        url = f"https://storage.googleapis.com/storage/v1/b/{quote(bucket, safe='')}/o/{quote(object_name, safe='')}"
        metadata_response = self.session.get(url, headers=headers, timeout=timeout)
        if metadata_response.status_code != 200:
            raise StorageError(f"storage_metadata_http_{metadata_response.status_code}")
        metadata = metadata_response.json()
        generation = str(metadata.get("generation", ""))
        if not re.fullmatch(r"[0-9]+", generation):
            raise StorageError("missing_object_generation")
        if int(metadata.get("size", max_bytes + 1)) > max_bytes:
            raise StorageError("fixture_too_large")
        response = self.session.get(
            url, params={"alt": "media", "generation": generation, "ifGenerationMatch": generation},
            headers=headers, timeout=timeout,
        )
        if response.status_code != 200:
            raise StorageError(f"storage_read_http_{response.status_code}")
        raw = response.content
        if len(raw) > max_bytes:
            raise StorageError("fixture_too_large")
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise StorageError("fixture_must_be_object")
        resource = {
            "uri": f"gs://{bucket}/{object_name}", "bucket": bucket, "object": object_name,
            "generation": generation, "metageneration": metadata.get("metageneration"),
            "sha256": sha256(raw), "bytes": len(raw), "updated": metadata.get("updated"),
            "version_binding": "read_pinned_to_metadata_generation",
        }
        return value, resource

    def create_json(self, bucket: str, object_name: str, value: dict, headers: dict, timeout=30) -> dict:
        raw = encoded(value)
        if len(raw) > 1024 * 1024:
            raise StorageError("output_too_large")
        response = self.session.post(
            f"https://storage.googleapis.com/upload/storage/v1/b/{quote(bucket, safe='')}/o",
            params={"uploadType": "media", "name": object_name, "ifGenerationMatch": "0"},
            headers={**headers, "Content-Type": "application/json"}, data=raw, timeout=timeout,
        )
        if response.status_code not in {200, 201}:
            # Only an actual provider response carries this evidence. A matching
            # error string, validation failure, or request exception does not.
            raise StorageError(
                f"storage_write_http_{response.status_code}",
                http_status=response.status_code, operation="storage.objects.create",
                target={"bucket": bucket, "object": object_name, "uri": f"gs://{bucket}/{object_name}"},
            )
        metadata = response.json()
        return {
            "uri": f"gs://{bucket}/{object_name}", "generation": str(metadata["generation"]),
            "sha256": sha256(raw), "bytes": len(raw), "operation": "created",
        }


@dataclass
class RunEvidence:
    requester: dict
    runtime_identity: dict
    prompt: str
    title: str
    model: str
    revision: str
    policy: dict
    instruction: str
    project: str
    client_request_id: str | None = None
    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    started_at: str = field(default_factory=now)
    trace_id: str = ""
    span_id: str = ""
    calls: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    resources: list[dict] = field(default_factory=list)
    invocation_ids: set[str] = field(default_factory=set)

    def event(self, action: str, fields: dict) -> dict:
        if len(self.events) >= 120:
            raise ValueError("event_limit_reached")
        result = {
            "schema_version": 1, "@timestamp": now(),
            "event": {"id": str(uuid.uuid4()), "dataset": "entity_intelligence.google_adk", "action": action},
            "run_id": self.run_id, "session_id": self.session_id,
            **({"client_request_id": self.client_request_id} if self.client_request_id else {}),
            "trace_id": self.trace_id, "requester": self.requester,
            "executing_principal": self.runtime_identity,
            "agent": {"name": "customer_support_agent", "provider": "google_adk", "model": self.model, "revision": self.revision},
            **fields,
        }
        self.events.append(result)
        print(json.dumps(result, ensure_ascii=False), flush=True)
        return result

    def snapshot(self, answer: str, status: str, error_code: str | None) -> dict:
        return {
            "schema_version": 1, "run_id": self.run_id, "session_id": self.session_id,
            **({"client_request_id": self.client_request_id} if self.client_request_id else {}),
            "invocation_ids": sorted(self.invocation_ids), "trace_id": self.trace_id,
            "span_id": self.span_id, "started_at": self.started_at, "completed_at": now(),
            "status": status, "error_code": error_code, "title": self.title,
            "requester": self.requester, "executing_principal": self.runtime_identity,
            "agent": {"name": "customer_support_agent", "provider": "google_adk", "model": self.model,
                      "revision": self.revision, "instruction_sha256": sha256(self.instruction.encode()),
                      "instruction": self.instruction},
            "prompt": self.prompt, "answer": answer,
            "calls": self.calls, "consumed_resources": self.resources,
            "policy": self.policy, "events": self.events,
            "provenance": {
                "tool_calls": "executed_adk_function_tools", "requester": "verified_google_account",
                "resource_versions": "storage_generation_pinned", "ownership": "external_register_required",
                "human_influence": "assessment_not_automatically_asserted",
                "enforcement": (
                    "google_cloud_storage_denial"
                    if any(call.get("resource_access", {}).get("status") == "denied" for call in self.calls)
                    else "elastic_workflow_gate" if any(call.get("enforcement") for call in self.calls)
                    else "monitor_only"
                ),
                "reasoning_captured": False,
            },
        }
