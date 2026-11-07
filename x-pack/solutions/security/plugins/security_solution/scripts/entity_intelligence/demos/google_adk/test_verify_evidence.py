"""Offline fixtures: prevent false joins and success claims in the evidence verifier."""

import copy
import json
from pathlib import Path
import tempfile
import unittest

import verify_evidence as verify

SA = "ei-agent-demo-runtime@example-ei-project.iam.gserviceaccount.com"
URI = "gs://example-ei-project-ei-agent-demo-support/cases/CASE-001.json"
POLICY = {"id": "p", "name": "Boundary", "revision": 1, "mode": "monitor", "rules": [
    {"id": "r", "tool": "read_support_case", "title": "Lookup requested", "reason": "Test policy", "severity": "high"}]}


def audit(tool_id="tool-a", generation="222", principal=SA, writing=False):
    return {"logName": "projects/example-ei-project/logs/cloudaudit.googleapis.com%2Fdata_access",
            "insertId": "audit-a", "timestamp": "2026-10-14T20:00:00Z", "protoPayload": {
                "serviceName": "storage.googleapis.com", "methodName": "storage.objects.create" if writing else "storage.objects.get",
                "resourceName": "projects/_/buckets/example-ei-project-ei-agent-demo-support/objects/cases/CASE-001.json",
                "authenticationInfo": {"principalEmail": principal},
                "response" if writing else "request": {"generation": generation},
                "metadata": {"audit_context": {"audit_info": {
                    "x-goog-custom-audit-ei-run": "run-a", "x-goog-custom-audit-ei-trace": "trace-a",
                    "x-goog-custom-audit-ei-tool": tool_id, "x-goog-custom-audit-ei-change-id": "change-a"}}}}}


def fixture_run():
    result = {"case_id": "CASE-001", "summary": "A synthetic case"}
    call = {"id": "tool-a", "name": "read_support_case", "trace_id": "trace-a", "invocation_id": "invoke-a",
            "outcome": "success", "input": {"case_id": "CASE-001"}, "result": result,
            "resource": {"uri": URI, "generation": "222", "sha256": verify.digest(verify.encoded(result))},
            "policy_matches": [{"policy_id": "p", "policy_revision": 1, "policy_sha256": verify.digest(verify.encoded(POLICY)),
                                "rule_id": "r", "title": "Lookup requested", "reason": "Test policy", "severity": "high",
                                "mode": "monitor", "decision": "record_and_continue", "enforced": False,
                                "operation_outcome": "success"}]}
    for name in ("input", "result"):
        call[name + "_sha256"] = verify.digest(verify.encoded(call[name]))
    return {"run_id": "run-a", "session_id": "session-a", "trace_id": "trace-a", "invocation_ids": ["invoke-a"],
            "status": "completed", "calls": [call], "policy": POLICY,
            "requester": {"email": "requester@example.com", "subject": "human-sub", "authenticated": True,
                          "principal_type": "google_account", "provenance": "google_signed_id_token_verified_by_application"},
            "executing_principal": {"email": SA, "principal_type": "service_account"}}


def receipt_change():
    before, after = b'{"summary":"before"}', b'{"summary":"after"}'
    metadata = {"bucket": "example-ei-project-ei-agent-demo-support", "name": "cases/CASE-001.json",
                "generation": "222", "size": str(len(after))}
    return {"change_id": "change-a", "resource": URI, "cli_account": "claimed-editor@example.com",
            "before": {"generation": "111"}, "after": metadata,
            "before_sha256": verify.digest(before), "after_sha256": verify.digest(after),
            "write_receipt": {"source": "google_storage_json_upload_response", "request_change_id": "change-a",
                              "precondition_generation": "111", "resource": copy.deepcopy(metadata)},
            "verification": {"source": "google_storage_generation_readback", "generation": "222",
                             "sha256": verify.digest(after), "matches_uploaded_bytes": True}}, before, after


class VerificationTests(unittest.TestCase):
    def test_join_requires_exact_tool_trace_run_resource_and_authenticated_runtime(self):
        run = fixture_run()
        state = {"runtime_service_account": SA}
        valid = verify.verify_run(run, [audit()], state, [])
        self.assertEqual(valid["tools"][0]["native_api_request_join"], "verified")
        self.assertEqual(valid["tools"][0]["native_generation_join"], "verified")
        self.assertEqual(valid["tools"][0]["content_hash_verification"], "recorded_by_application_only")
        variants = [audit(tool_id="other-tool"), audit(principal="different@example.com")]
        wrong_resource = audit()
        wrong_resource["protoPayload"]["resourceName"] += "-other"
        variants.append(wrong_resource)
        wrong_trace = audit()
        wrong_trace["protoPayload"]["metadata"]["audit_context"]["audit_info"]["x-goog-custom-audit-ei-trace"] = "other-trace"
        variants.append(wrong_trace)
        for event in variants:
            result = verify.verify_run(run, [event], state, [])
            self.assertEqual(result["tools"][0]["native_api_request_join"], "missing")

    def test_tampered_policy_and_result_do_not_verify(self):
        run = fixture_run()
        run["calls"][0]["result"]["summary"] = "tampered"
        run["calls"][0]["policy_matches"][0]["policy_revision"] = 9
        result = verify.verify_run(run, [audit(generation="111")], {"runtime_service_account": SA}, [])
        self.assertEqual(set(result["tools"][0]["issues"]), {
            "result_hash_mismatch", "policy_snapshot_or_outcome_mismatch", "native_audit_generation_mismatch"})

    def test_editor_requires_exact_native_generation_not_cli_account_or_nearby_log(self):
        before, after = b'{"summary":"before"}', b'{"summary":"after"}'
        change = {"change_id": "change-a", "resource": URI, "cli_account": "claimed-editor@example.com",
                  "before": {"generation": "111"}, "after": {"generation": "222"},
                  "before_sha256": verify.digest(before), "after_sha256": verify.digest(after)}
        event = audit(principal="observed-editor@example.com", writing=True)
        verified = verify.verify_change(change, before, after, [event])
        self.assertEqual(verified["editor"], "observed-editor@example.com")
        self.assertEqual(verified["editor_status"], "verified_native_generation_join")
        del event["protoPayload"]["response"]["generation"]
        partial = verify.verify_change(change, before, after, [event])
        self.assertIsNone(partial["editor"])
        self.assertEqual(partial["editor_status"], "generation_binding_missing")
        event["protoPayload"]["metadata"]["audit_context"]["audit_info"].pop("x-goog-custom-audit-ei-change-id")
        self.assertEqual(verify.verify_change(change, before, after, [event])["editor_status"], "matching_audit_event_missing")

    def test_failed_request_and_request_precondition_never_prove_successful_export_generation(self):
        event = audit(writing=True)
        event["protoPayload"]["status"] = {"code": 7}
        self.assertFalse(verify.audit_success(event))
        del event["protoPayload"]["response"]
        event["protoPayload"]["request"] = {"ifGenerationMatch": "0"}
        self.assertEqual(verify.audit_generation(event, writing=True), [])

    def test_exact_api_receipt_readback_and_audit_can_bind_editor_without_claiming_native_generation(self):
        change, before, after = receipt_change()
        event = audit(principal="observed-editor@example.com", writing=True)
        del event["protoPayload"]["response"]["generation"]
        report = verify.verify_change(change, before, after, [event])
        self.assertEqual(report["editor"], "observed-editor@example.com")
        self.assertEqual(report["editor_status"], "verified_api_receipt_and_audit_join")
        self.assertEqual(report["native_generation_join"], "missing")
        self.assertEqual(report["upload_receipt_and_readback"], "verified_local_artifact_consistency")
        self.assertEqual(report["human_influence"], "not_inferred")

    def test_receipt_chain_rejects_changed_request_resource_generation_precondition_and_bytes(self):
        original, before, after = receipt_change()
        event = audit(principal="observed-editor@example.com", writing=True)
        del event["protoPayload"]["response"]["generation"]
        variants = [
            ("write_receipt", "request_change_id", "other-change"),
            ("write_receipt", "precondition_generation", "999"),
            ("verification", "generation", "999"),
            ("verification", "sha256", "0" * 64),
            ("verification", "matches_uploaded_bytes", False),
        ]
        for section, key, value in variants:
            change = copy.deepcopy(original)
            change[section][key] = value
            with self.subTest(section=section, key=key):
                report = verify.verify_change(change, before, after, [event])
                self.assertIsNone(report["editor"])
                self.assertEqual(report["editor_status"], "inconsistent_evidence")
        changed_resource = copy.deepcopy(original)
        changed_resource["write_receipt"]["resource"]["name"] = "cases/unrelated.json"
        self.assertIsNone(verify.verify_change(changed_resource, before, after, [event])["editor"])

    def test_receipt_does_not_override_conflicting_native_generation_or_ambiguous_principals(self):
        change, before, after = receipt_change()
        wrong_generation = audit(principal="observed-editor@example.com", writing=True, generation="333")
        report = verify.verify_change(change, before, after, [wrong_generation])
        self.assertIsNone(report["editor"])
        self.assertIn("native_audit_generation_conflicts_with_recorded_change", report["issues"])
        events = [audit(principal="editor-one@example.com", writing=True), audit(principal="editor-two@example.com", writing=True)]
        for event in events:
            del event["protoPayload"]["response"]["generation"]
        ambiguous = verify.verify_change(change, before, after, events)
        self.assertIsNone(ambiguous["editor"])
        self.assertEqual(ambiguous["editor_status"], "ambiguous_native_principals")

    def test_claimed_prior_consumption_cannot_point_to_a_nonexistent_tool(self):
        run = fixture_run()
        run["calls"][0]["consumed_before_call"] = [{"retrieved_by_tool_call_id": "not-executed", "uri": URI,
                                                   "generation": "222", "sha256": "a" * 64}]
        report = verify.verify_run(run, [audit()], {"runtime_service_account": SA}, [])
        self.assertIn("claimed_prior_consumption_not_bound_to_an_earlier_successful_tool", report["tools"][0]["issues"])

    def test_export_marks_missing_records_partial_and_omits_prompt_or_result_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            state_dir = Path(directory)
            export_dir = state_dir / "exports" / "test"
            export_dir.mkdir(parents=True)
            (state_dir / "resources.json").write_text(json.dumps({"project_id": "example-ei-project", "runtime_service_account": SA}))
            (export_dir / "manifest.json").write_text(json.dumps({"project_id": "example-ei-project", "run_ids": ["run-a", "missing-run"]}))
            run = fixture_run()
            run["prompt"] = "A prompt must never be reproduced in the report"
            (export_dir / "run-run-a.json").write_text(json.dumps(run))
            report = verify.verify_export(export_dir, state_dir)
            self.assertEqual(report["verification"], "partial")
            self.assertIn("missing-run", report["missing_or_limited_evidence"])
            self.assertNotIn(run["prompt"], json.dumps(report))
            self.assertNotIn("A synthetic case", json.dumps(report))
            self.assertEqual(report["ownership"]["status"], "missing_or_mismatched")


if __name__ == "__main__":
    unittest.main()
