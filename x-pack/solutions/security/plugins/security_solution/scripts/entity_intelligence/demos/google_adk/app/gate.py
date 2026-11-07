"""Pre-operation gate whose decision channel is separate from agent-writable data."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
import time
import uuid

from core import StorageError


CORRELATION_FIELDS = (
    "request_id", "run_id", "session_id", "trace_id", "tool_call_id", "input_sha256",
)
DECISION_FIELDS = {
    "schema_version", *CORRELATION_FIELDS, "decision", "decided_at", "expires_at",
    "workflow_id", "workflow_execution_id", "policy_id", "policy_revision", "reason", "provenance",
}
DEFAULT_WORKFLOW_ID = "workflow-ei-google-export-prevention-v1"
POLICY_ID = "ei-google-export-prevention"
POLICY_REVISION = 1


def timestamp(value: str) -> datetime:
    if not isinstance(value, str) or len(value) > 40:
        raise ValueError("invalid_timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp_requires_timezone")
    return parsed.astimezone(timezone.utc)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def validate_decision(value: dict, request: dict, observed_at: datetime,
                      workflow_id: str = DEFAULT_WORKFLOW_ID) -> None:
    """Object authenticity comes from control-bucket IAM, not a model-supplied label.

    The relay must create decisions with ifGenerationMatch=0. The reader pins the
    object generation and verifies all bindings before permitting any side effect.
    """
    if not isinstance(value, dict) or set(value) != DECISION_FIELDS:
        raise ValueError("invalid_decision_fields")
    if type(value["schema_version"]) is not int or value["schema_version"] != 1:
        raise ValueError("invalid_decision_version")
    if any(value[key] != request[key] for key in CORRELATION_FIELDS):
        raise ValueError("decision_correlation_mismatch")
    if value["provenance"] != "elastic_workflow" or value["decision"] not in {"allow", "deny"}:
        raise ValueError("invalid_decision_source")
    for field in ("workflow_id", "workflow_execution_id", "policy_id"):
        if not isinstance(value[field], str) or not re.fullmatch(r"[a-zA-Z0-9_.:-]{1,200}", value[field]):
            raise ValueError("missing_workflow_or_policy_reference")
    if type(value["policy_revision"]) is not int or value["policy_revision"] < 1:
        raise ValueError("invalid_policy_revision")
    if (value["workflow_id"] != workflow_id or value["policy_id"] != POLICY_ID
            or value["policy_revision"] != POLICY_REVISION):
        raise ValueError("unexpected_workflow_or_policy")
    if not isinstance(value["reason"], str) or not 1 <= len(value["reason"]) <= 1000:
        raise ValueError("invalid_decision_reason")
    created, deadline = timestamp(request["created_at"]), timestamp(request["expires_at"])
    decided, expires = timestamp(value["decided_at"]), timestamp(value["expires_at"])
    if not created <= decided <= observed_at + timedelta(seconds=2):
        raise ValueError("decision_time_outside_request")
    if not decided < expires <= deadline or not created <= observed_at < expires:
        raise ValueError("decision_expired_or_outside_request")


class ExportGate:
    """One bounded export decision per run; retries cannot bypass a stopped action."""

    def __init__(self, storage, evidence_bucket: str, control_bucket: str, timeout_seconds=75,
                 clock=None, monotonic=None, sleep=None, workflow_id=DEFAULT_WORKFLOW_ID):
        if not 5 <= timeout_seconds <= 90:
            raise ValueError("gate_timeout_out_of_bounds")
        if evidence_bucket == control_bucket:
            raise ValueError("control_bucket_must_be_separate")
        if not re.fullmatch(r"[a-zA-Z0-9_.:-]{1,200}", workflow_id):
            raise ValueError("invalid_workflow_id")
        self.storage = storage
        self.evidence_bucket = evidence_bucket
        self.control_bucket = control_bucket
        self.timeout_seconds = timeout_seconds
        self.workflow_id = workflow_id
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.monotonic = monotonic or time.monotonic
        self.sleep = sleep or time.sleep
        self.attempted = False
        # Leave at least 40 seconds of the 150-second run for a permitted write
        # (30-second HTTP timeout), evidence persistence and a final model answer.
        self.run_gate_deadline = self.monotonic() + 110

    def evaluate(self, run, call: dict, target: dict, headers: dict) -> dict:
        if self.attempted:
            return {"status": "gate_attempt_limit", "action_prevented": True,
                    "reason": "This run already requested an export decision. Start a new run to retry."}
        self.attempted = True
        started = self.clock()
        window = min(self.timeout_seconds, self.run_gate_deadline - self.monotonic())
        if window < 5:
            return {"status": "gate_time_budget_exhausted", "action_prevented": True,
                    "reason": "The run has insufficient time left to obtain a workflow decision."}
        deadline = self.monotonic() + window
        request = {
            "schema_version": 1, "request_id": str(uuid.uuid4()), "run_id": run.run_id,
            **({"client_request_id": run.client_request_id} if run.client_request_id else {}),
            "session_id": run.session_id, "trace_id": run.trace_id,
            "tool_call_id": call["id"], "invocation_id": call["invocation_id"],
            "tool_name": call["name"], "input_sha256": call["input_sha256"], "input": call["input"],
            "created_at": iso(started), "expires_at": iso(started + timedelta(seconds=window)),
            "requester": run.requester, "executing_principal": run.runtime_identity,
            "target": target, "source_policy_matches": call["policy_matches"],
        }
        evidence = {"status": "pending", "action_prevented": True, "request": request}
        try:
            evidence["request_resource"] = self.storage.create_json(
                self.evidence_bucket, f"gates/requests/{request['request_id']}.json", request, headers, timeout=10,
            )
        except Exception:
            return {**evidence, "status": "gate_unavailable", "reason": "Could not publish the pre-operation request."}
        run.event("tool_gate_pending", {"tool_call_id": call["id"], "enforcement": evidence.copy()})
        while self.monotonic() < deadline:
            remaining = deadline - self.monotonic()
            if remaining < 1:
                break
            try:
                value, resource = self.storage.read_json(
                    self.control_bucket, f"gates/decisions/{request['request_id']}.json", headers,
                    max_bytes=16384, timeout=min(2, remaining / 2),
                )
            except StorageError as error:
                if str(error) == "storage_metadata_http_404":
                    self.sleep(min(1, max(0, deadline - self.monotonic())))
                    continue
                return {**evidence, "status": "gate_unavailable", "reason": "The trusted decision channel was unavailable."}
            except Exception:
                return {**evidence, "status": "invalid_decision", "reason": "The decision object could not be validated."}
            try:
                validate_decision(value, request, self.clock(), self.workflow_id)
                expected_uri = f"gs://{self.control_bucket}/gates/decisions/{request['request_id']}.json"
                if resource.get("uri") != expected_uri or not re.fullmatch(r"[0-9]+", str(resource.get("generation", ""))):
                    raise ValueError("decision_object_not_generation_bound")
                if resource.get("version_binding") != "read_pinned_to_metadata_generation":
                    raise ValueError("decision_read_not_pinned")
                if self.monotonic() >= deadline:
                    break
            except (ValueError, TypeError):
                return {**evidence, "status": "invalid_decision", "reason": "The decision did not match this exact pending action."}
            denied = value["decision"] == "deny"
            return {**evidence, "status": "workflow_blocked" if denied else "workflow_allowed",
                    "action_prevented": denied, "decision": value, "decision_resource": resource,
                    "reason": value["reason"]}
        return {**evidence, "status": "decision_timeout", "reason": "No valid workflow decision arrived before this request expired."}
