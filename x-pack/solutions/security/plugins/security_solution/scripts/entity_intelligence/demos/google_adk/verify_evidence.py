#!/usr/bin/env python3
"""Check local demo exports without contacting Google or exposing prompt/tool contents.

Example: python3 verify_evidence.py --export infra/state/example-ei-project/exports/<stamp>
Checks artifact consistency and exact cross-record joins, not cryptographic authenticity.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
PROJECT = os.environ.get("EI_GOOGLE_PROJECT_ID", "example-ei-project")
DEFAULT_STATE = ROOT / "infra" / "state" / PROJECT
HEX = re.compile(r"[0-9a-f]{64}")


def encoded(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def at(value, *keys):
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def read_json(path, max_bytes=2 * 1024 * 1024):
    if path.stat().st_size > max_bytes:
        raise ValueError(f"Artifact exceeds size limit: {path.name}")
    return json.loads(path.read_text())


def within(path, root):
    resolved = path.resolve()
    if not resolved.is_relative_to(root.resolve()):
        raise ValueError("Artifact path escapes the selected demo state directory")
    return resolved


def read_lines(path):
    if not path.exists():
        return []
    if path.stat().st_size > 32 * 1024 * 1024:
        raise ValueError(f"Audit export exceeds size limit: {path.name}")
    result = []
    with path.open() as stream:
        for line in stream:
            if len(result) >= 2000:
                raise ValueError("Audit export exceeds 2000 records")
            if line.strip():
                value = json.loads(line)
                if isinstance(value, dict):
                    result.append(value)
    return result


def object_identity(value):
    """Exact resource identity; do not match by substring or by timestamp."""
    if not isinstance(value, str):
        return None
    if value.startswith("gs://"):
        parts = value[5:].split("/", 1)
        return tuple(parts) if len(parts) == 2 else None
    match = re.fullmatch(r"(?:storage\.googleapis\.com/)?projects/[^/]+/buckets/([^/]+)/objects/(.+)", value)
    return (unquote(match[1]), unquote(match[2])) if match else None


def audit_info(event):
    value = at(event, "protoPayload", "metadata", "audit_context", "audit_info")
    return value if isinstance(value, dict) else {}


def audit_success(event):
    return at(event, "protoPayload", "status", "code") in (None, 0, "0")


def audit_generation(event, writing=False):
    # A create request's ifGenerationMatch=0 is a precondition, not its resulting generation.
    paths = [("response", "generation")]
    if not writing:
        paths += [("request", "generation"), ("request", "ifGenerationMatch")]
    values = {str(at(event, "protoPayload", *path)) for path in paths
              if at(event, "protoPayload", *path) not in (None, "", 0, "0")}
    return sorted(values)


def event_reference(event):
    return {"log_name": event.get("logName"), "insert_id": event.get("insertId"),
            "timestamp": event.get("timestamp"),
            "method": at(event, "protoPayload", "methodName"),
            "principal": at(event, "protoPayload", "authenticationInfo", "principalEmail")}


def scoped_audits(events, project):
    prefix = f"projects/{project}/logs/cloudaudit.googleapis.com"
    return [event for event in events if str(event.get("logName", "")).startswith(prefix)
            and at(event, "protoPayload", "serviceName") == "storage.googleapis.com"]


def matches_resource(event, uri):
    expected = object_identity(uri)
    return expected is not None and object_identity(at(event, "protoPayload", "resourceName")) == expected


def verify_change(change, before_bytes, after_bytes, audits):
    issues = []
    if digest(before_bytes) != change.get("before_sha256"):
        issues.append("before_file_hash_mismatch")
    if digest(after_bytes) != change.get("after_sha256"):
        issues.append("after_file_hash_mismatch")
    generation = str(at(change, "after", "generation") or "")
    before_generation = str(at(change, "before", "generation") or "")
    if not generation.isdecimal() or not before_generation.isdecimal() or generation == before_generation:
        issues.append("invalid_or_unchanged_generation")
    change_id = change.get("change_id")
    receipt, readback = change.get("write_receipt"), change.get("verification")
    receipt_valid = False
    if receipt is not None or readback is not None:
        resource = at(receipt, "resource") or {}
        identity = object_identity(change.get("resource"))
        receipt_valid = (isinstance(receipt, dict) and isinstance(readback, dict)
                         and receipt.get("source") == "google_storage_json_upload_response"
                         and bool(change_id) and receipt.get("request_change_id") == change_id
                         and identity == (resource.get("bucket"), resource.get("name"))
                         and str(resource.get("generation")) == generation
                         and str(resource.get("size")) == str(len(after_bytes))
                         and str(receipt.get("precondition_generation")) == before_generation
                         and all(resource.get(key) == at(change, "after", key)
                                 for key in ("bucket", "name", "generation", "size"))
                         and readback.get("source") == "google_storage_generation_readback"
                         and str(readback.get("generation")) == generation
                         and readback.get("sha256") == digest(after_bytes)
                         and readback.get("matches_uploaded_bytes") is True)
        if not receipt_valid:
            issues.append("upload_receipt_or_generation_readback_mismatch")
    joined = [event for event in audits if change_id
              and audit_info(event).get("x-goog-custom-audit-ei-change-id") == change_id
              and matches_resource(event, change.get("resource"))
              and at(event, "protoPayload", "methodName") == "storage.objects.create"
              and audit_success(event)]
    principals = {at(event, "protoPayload", "authenticationInfo", "principalEmail") for event in joined
                  if at(event, "protoPayload", "authenticationInfo", "principalEmail")}
    exact = [event for event in joined if audit_generation(event, writing=True) == [generation]
             and at(event, "protoPayload", "authenticationInfo", "principalEmail")]
    exact_principals = {at(event, "protoPayload", "authenticationInfo", "principalEmail") for event in exact}
    observed_generations = {value for event in joined for value in audit_generation(event, writing=True)}
    if observed_generations - {generation}:
        issues.append("native_audit_generation_conflicts_with_recorded_change")
    editor = None
    if issues:
        editor_status = "inconsistent_evidence"
    elif len(principals) > 1:
        editor_status = "ambiguous_native_principals"
    elif len(exact_principals) == 1:
        editor, editor_status = next(iter(exact_principals)), "verified_native_generation_join"
    elif receipt_valid and len(principals) == 1:
        editor, editor_status = next(iter(principals)), "verified_api_receipt_and_audit_join"
    else:
        editor_status = "generation_binding_missing" if joined else "matching_audit_event_missing"
    return {
        "change_id": change_id, "uri": change.get("resource"), "generation": generation,
        "before_generation": before_generation, "sha256": digest(after_bytes),
        "content_hashes": "verified_local_bytes" if not issues else "inconsistent",
        "issues": issues,
        "editor": editor, "editor_status": editor_status,
        "native_generation_join": "verified" if editor_status == "verified_native_generation_join"
                                  else "conflicting" if observed_generations - {generation} else "missing",
        "upload_receipt_and_readback": "verified_local_artifact_consistency" if receipt_valid and not issues
                                       else "inconsistent" if receipt is not None or readback is not None else "missing",
        "editor_evidence_basis": "Successful create audit: exact change ID, resource, authenticated principal; "
                                 "upload response and generation-pinned readback bind that request to the recorded version."
                                 if editor_status == "verified_api_receipt_and_audit_join" else None,
        "observed_change_request_principals": sorted(principals),
        "audit_events": [event_reference(event) for event in joined],
        "human_influence": "not_inferred",
    }


def check_policy(policy, call):
    errors = []
    expected = [rule for rule in policy.get("rules", []) if rule.get("tool") == call.get("name")]
    actual = call.get("policy_matches", [])
    if policy.get("mode") != "monitor":
        errors.append("policy_is_not_monitor_only")
    if sorted(str(rule.get("id")) for rule in expected) != sorted(str(match.get("rule_id")) for match in actual):
        errors.append("policy_rule_set_mismatch")
    for match in actual:
        rules = [rule for rule in expected if rule.get("id") == match.get("rule_id")]
        valid = (len(rules) == 1 and match.get("policy_id") == policy.get("id")
                 and match.get("policy_revision") == policy.get("revision")
                 and match.get("policy_sha256") == digest(encoded(policy))
                 and match.get("mode") == "monitor" and match.get("decision") == "record_and_continue"
                 and match.get("enforced") is False and match.get("operation_outcome") == call.get("outcome"))
        if valid:
            valid = all(match.get(key) == rules[0].get(key) for key in ("title", "reason", "severity"))
        if not valid:
            errors.append("policy_snapshot_or_outcome_mismatch")
    return sorted(set(errors))


def verify_run(run, audits, state, changes):
    errors = []
    requester = run.get("requester", {})
    runtime = run.get("executing_principal", {})
    runtime_email = runtime.get("email")
    expected_runtime = state.get("runtime_service_account")
    if not expected_runtime or runtime_email != expected_runtime or runtime.get("principal_type") != "service_account":
        errors.append("runtime_identity_does_not_match_provisioned_service_account")
    requester_recorded = (requester.get("authenticated") is True and bool(requester.get("subject"))
                          and bool(requester.get("email"))
                          and requester.get("provenance") == "google_signed_id_token_verified_by_application")
    if not requester_recorded:
        errors.append("authenticated_requester_record_missing")
    if requester.get("email") == runtime_email:
        errors.append("requester_equals_runtime_service_account_not_a_separate_human_account")
    calls = run.get("calls", [])
    identifiers = [call.get("id") for call in calls]
    if any(not isinstance(value, str) or not value for value in identifiers) or len(set(identifiers)) != len(identifiers):
        errors.append("tool_call_ids_missing_or_not_unique")
    policy = run.get("policy", {})
    call_reports = []
    previous_resources = {}
    for call in calls:
        problems = check_policy(policy, call)
        for name in ("input", "result"):
            if call.get(name + "_sha256") != digest(encoded(call.get(name))):
                problems.append(name + "_hash_mismatch")
        if call.get("trace_id") != run.get("trace_id") or call.get("invocation_id") not in run.get("invocation_ids", []):
            problems.append("trace_or_adk_invocation_mismatch")
        for consumed in call.get("consumed_before_call", []):
            previous = previous_resources.get(consumed.get("retrieved_by_tool_call_id"))
            if not previous or any(previous.get(key) != consumed.get(key) for key in ("uri", "generation", "sha256")):
                problems.append("claimed_prior_consumption_not_bound_to_an_earlier_successful_tool")
        resource = call.get("resource", {})
        generation = str(resource.get("generation") or "")
        resource_valid = (object_identity(resource.get("uri")) is not None and generation.isdecimal()
                          and isinstance(resource.get("sha256"), str) and HEX.fullmatch(resource["sha256"]) is not None)
        if call.get("outcome") == "success" and not resource_valid:
            problems.append("successful_tool_resource_version_missing")
        writing = call.get("name") == "export_case_summary"
        expected_method = "storage.objects.create" if writing else "storage.objects.get"
        joined = [event for event in audits if run.get("run_id") and call.get("id") and run.get("trace_id")
                  and audit_info(event).get("x-goog-custom-audit-ei-run") == run["run_id"]
                  and audit_info(event).get("x-goog-custom-audit-ei-trace") == run["trace_id"]
                  and audit_info(event).get("x-goog-custom-audit-ei-tool") == call["id"]
                  and at(event, "protoPayload", "authenticationInfo", "principalEmail") == runtime_email
                  and at(event, "protoPayload", "methodName") == expected_method
                  and matches_resource(event, resource.get("uri"))]
        succeeded = [event for event in joined if audit_success(event)]
        generations = {value for event in succeeded for value in audit_generation(event, writing)}
        if generations and generation not in generations:
            problems.append("native_audit_generation_mismatch")
        consumed_changes = [change for change in changes if change["uri"] == resource.get("uri")
                            and change["generation"] == generation and change["sha256"] == resource.get("sha256")
                            and change["content_hashes"] == "verified_local_bytes"
                            and call.get("name") == "read_support_case" and call.get("outcome") == "success"]
        call_reports.append({
            "tool_call_id": call.get("id"), "tool": call.get("name"), "outcome": call.get("outcome"),
            "integrity": "inconsistent" if problems else "verified_artifact_consistency", "issues": problems,
            "policy_matches": [{"policy_id": match.get("policy_id"), "revision": match.get("policy_revision"),
                                "rule_id": match.get("rule_id"), "operation_outcome": match.get("operation_outcome"),
                                "blocking": False if match.get("enforced") is False else "unverified"}
                               for match in call.get("policy_matches", [])],
            "resource": {key: resource.get(key) for key in ("uri", "generation", "sha256")},
            "native_api_request_join": "verified" if succeeded else "failed_request_only" if joined else "missing",
            "native_generation_join": "verified" if generation in generations else "missing",
            "audit_events": [event_reference(event) for event in joined],
            "consumed_change_ids": [change["change_id"] for change in consumed_changes],
            "content_hash_verification": "verified_against_change_artifact" if consumed_changes else "recorded_by_application_only",
        })
        if call.get("outcome") == "success" and resource.get("version_binding") and not problems:
            previous_resources[call.get("id")] = resource
    return {
        "run_id": run.get("run_id"), "session_id": run.get("session_id"), "status": run.get("status"),
        "requester": {key: requester.get(key) for key in ("email", "subject", "principal_type", "provenance")},
        "requester_verification": "recorded_by_application_not_reverified_from_token" if requester_recorded else "missing",
        "runtime_service_account": runtime_email,
        "runtime_matches_provisioning_record": runtime_email == expected_runtime and bool(expected_runtime),
        "issues": errors, "tools": call_reports, "human_influence": "not_inferred",
        "causation": "An exact consumed-version join does not by itself prove why the model selected a later action.",
    }


def verify_export(export_dir, state_dir):
    state_dir = state_dir.resolve()
    export_dir = within(export_dir, state_dir)
    manifest = read_json(within(export_dir / "manifest.json", state_dir))
    state = read_json(within(state_dir / "resources.json", state_dir))
    if manifest.get("project_id") != PROJECT or state.get("project_id") != manifest.get("project_id"):
        raise ValueError("Verifier is scoped to the explicitly configured project demo artifacts")
    audits = scoped_audits(read_lines(within(export_dir / "cloud-audit.jsonl", state_dir)), manifest["project_id"])
    changes = []
    for path in sorted((state_dir / "changes").glob("*/change.json")):
        change = read_json(within(path, state_dir))
        before_path = within(path.parent / "before.json", state_dir)
        after_path = within(path.parent / "after.json", state_dir)
        if before_path.stat().st_size > 16384 or after_path.stat().st_size > 16384:
            raise ValueError("Change fixture exceeds its bounded size")
        changes.append(verify_change(change, before_path.read_bytes(), after_path.read_bytes(), audits))
    runs, missing = [], []
    for run_id in manifest.get("run_ids", []):
        if not isinstance(run_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", run_id):
            raise ValueError("Invalid run ID in manifest")
        path = within(export_dir / f"run-{run_id}.json", state_dir)
        if not path.exists():
            missing.append(run_id)
            continue
        run = read_json(path)
        if run.get("run_id") != run_id:
            raise ValueError("Run filename and embedded ID differ")
        runs.append(verify_run(run, audits, state, changes))
    ownership_path = within(export_dir / "ownership.json", state_dir)
    ownership = read_json(ownership_path) if ownership_path.exists() else {}
    ownership_matches = (ownership.get("service_account_email") == state.get("runtime_service_account")
                         and ownership.get("service_account_unique_id") == state.get("runtime_unique_id")
                         and bool(state.get("runtime_unique_id")) and ownership.get("provenance") == "operator_declared")
    inconsistent = any(run["issues"] or any(tool["issues"] for tool in run["tools"]) for run in runs) or any(change["issues"] for change in changes)
    gaps = list(missing)
    if not runs:
        gaps.append("No exported runs listed in the manifest")
    if not audits:
        gaps.append("No scoped Storage audit records exported")
    if not ownership_matches:
        gaps.append("Declared ownership record missing or does not match the provisioned service-account identity")
    for run in runs:
        for tool in run["tools"]:
            if tool["native_api_request_join"] == "missing" or tool["native_generation_join"] == "missing":
                gaps.append(f"Native operation or generation join incomplete: {run['run_id']}/{tool['tool_call_id']}")
    for change in changes:
        if change["editor_status"] not in ("verified_native_generation_join", "verified_api_receipt_and_audit_join"):
            gaps.append(f"Edited-generation principal not verified: {change['change_id']}")
        elif change["native_generation_join"] == "missing":
            gaps.append(f"Native log generation field missing; editor supported by API receipt and audit chain: {change['change_id']}")
    if any(log.get("possibly_truncated") for log in manifest.get("logs", {}).values()):
        gaps.append("Export manifest marks one or more log sets possibly truncated")
    return {
        "verification": "inconsistent" if inconsistent else "partial" if gaps else "verified_available_cross_record_joins",
        "scope": "Local demo artifact consistency and exact joins; no cloud access or cryptographic log authenticity check",
        "project": manifest["project_id"], "export_window": {key: manifest.get(key) for key in ("start", "end")},
        "ownership": {"status": "declared_matching_service_account" if ownership_matches else "missing_or_mismatched",
                      "accountable_owner": ownership.get("accountable_owner") if ownership_matches else None,
                      "provenance": "operator_declared_not_execution_or_influence_evidence"},
        "runs": runs, "changes": changes, "missing_or_limited_evidence": gaps,
        "limitations": ["Google request tokens are deliberately absent; requester authentication is recorded by the application.",
                        "Custom audit headers correlate requests; they do not authenticate a human.",
                        "Application-recorded content hashes are independently checked only when exact version bytes are available.",
                        "No statement of human intent, model causation, Elastic alert creation, or blocking is inferred."],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", type=Path, required=True)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        report = verify_export(args.export, args.state)
        rendered = json.dumps(report, indent=2) + "\n"
        if args.output:
            args.output.write_text(rendered)
            args.output.chmod(0o600)
            print(f"Evidence report: {args.output.resolve()} ({report['verification']})")
        else:
            print(rendered, end="")
        return 2 if report["verification"] == "inconsistent" else 0
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(f"Cannot verify evidence: {type(error).__name__}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
