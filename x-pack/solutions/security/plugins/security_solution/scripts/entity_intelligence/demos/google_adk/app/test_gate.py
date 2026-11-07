import contextlib
from datetime import datetime, timedelta, timezone
import io
import unittest

from core import RunEvidence, StorageError, encoded, sha256
from gate import CORRELATION_FIELDS, ExportGate, iso, validate_decision


class FakeClock:
    def __init__(self):
        self.seconds = 0
        self.base = datetime(2026, 10, 14, tzinfo=timezone.utc)

    def now(self):
        return self.base + timedelta(seconds=self.seconds)

    def monotonic(self):
        return self.seconds

    def sleep(self, seconds):
        self.seconds += seconds


def decision_for(request, decision="deny"):
    return {
        "schema_version": 1, **{key: request[key] for key in CORRELATION_FIELDS},
        "decision": decision, "decided_at": request["created_at"], "expires_at": request["expires_at"],
        "workflow_id": "workflow-ei-google-export-prevention-v1", "workflow_execution_id": "execution-1",
        "policy_id": "ei-google-export-prevention", "policy_revision": 1,
        "reason": "Customer reference export is prohibited.", "provenance": "elastic_workflow",
    }


class GateStorage:
    def __init__(self, response="deny"):
        self.response, self.created, self.reads = response, [], []

    def create_json(self, bucket, name, value, headers, timeout=30):
        self.created.append((bucket, name, value))
        return {"uri": f"gs://{bucket}/{name}", "generation": "123", "sha256": sha256(encoded(value)), "operation": "created"}

    def read_json(self, bucket, name, headers, max_bytes=16384, timeout=20):
        self.reads.append((bucket, name))
        if isinstance(self.response, Exception):
            raise self.response
        request = self.created[0][2]
        value = self.response(request) if callable(self.response) else decision_for(request, self.response)
        return value, {"uri": f"gs://{bucket}/{name}", "generation": "456", "sha256": sha256(encoded(value)),
                       "version_binding": "read_pinned_to_metadata_generation"}


def fixture():
    run = RunEvidence({"subject": "account-1"}, {"email": "runtime@project.iam.gserviceaccount.com"},
                      "Export", "Review", "model", "revision", {"mode": "monitor"}, "Instructions", "project")
    run.trace_id = "a" * 32
    call = {"id": "call-export", "invocation_id": "invocation-1", "name": "export_case_summary",
            "input": {"summary": "Synthetic record DEMO-001"}, "policy_matches": []}
    call["input_sha256"] = sha256(encoded(call["input"]))
    target = {"bucket": "export-fixture", "object": f"exports/{run.run_id}/call.json",
              "uri": f"gs://export-fixture/exports/{run.run_id}/call.json"}
    return run, call, target


class GateTests(unittest.TestCase):
    def evaluate(self, storage, seconds=5):
        self.clock = FakeClock()
        gate = ExportGate(storage, "evidence", "control", seconds, self.clock.now, self.clock.monotonic, self.clock.sleep)
        run, call, target = fixture()
        with contextlib.redirect_stdout(io.StringIO()):
            result = gate.evaluate(run, call, target, {})
        return gate, run, call, target, result

    def test_valid_workflow_deny_binds_exact_pending_action_and_object_generation(self):
        storage = GateStorage("deny")
        gate, run, call, target, result = self.evaluate(storage)
        self.assertEqual(result["status"], "workflow_blocked")
        self.assertTrue(result["action_prevented"])
        self.assertEqual(result["decision"]["workflow_execution_id"], "execution-1")
        self.assertEqual(result["decision_resource"]["generation"], "456")
        request = storage.created[0][2]
        self.assertEqual(request["input_sha256"], call["input_sha256"])
        self.assertEqual(request["target"], target)
        self.assertNotEqual(storage.created[0][0], storage.reads[0][0])
        self.assertEqual(gate.evaluate(run, call, target, {})["status"], "gate_attempt_limit")
        self.assertEqual(len(storage.created), 1)

    def test_only_exact_allow_permits_operation(self):
        result = self.evaluate(GateStorage("allow"))[-1]
        self.assertEqual(result["status"], "workflow_allowed")
        self.assertFalse(result["action_prevented"])

    def test_client_nonce_is_carried_into_exact_pending_request_and_snapshot(self):
        storage, clock = GateStorage("deny"), FakeClock()
        gate = ExportGate(storage, "evidence", "control", 5, clock.now, clock.monotonic, clock.sleep)
        run, call, target = fixture()
        run.client_request_id = "55555555-5555-4555-8555-555555555555"
        with contextlib.redirect_stdout(io.StringIO()):
            result = gate.evaluate(run, call, target, {})
        self.assertEqual(result["request"]["client_request_id"], run.client_request_id)
        self.assertEqual(storage.created[0][2]["client_request_id"], run.client_request_id)
        self.assertEqual(run.snapshot("Stopped", "completed", None)["client_request_id"], run.client_request_id)
        self.assertEqual(result["status"], "workflow_blocked")

    def test_old_invocations_without_client_nonce_remain_compatible(self):
        gate, run, call, target, result = self.evaluate(GateStorage("deny"))
        self.assertNotIn("client_request_id", result["request"])
        self.assertNotIn("client_request_id", run.snapshot("Stopped", "completed", None))

    def test_missing_decision_times_out_and_does_not_claim_workflow_block(self):
        result = self.evaluate(GateStorage(StorageError("storage_metadata_http_404")))[-1]
        self.assertEqual(result["status"], "decision_timeout")
        self.assertTrue(result["action_prevented"])
        self.assertNotIn("decision", result)
        self.assertEqual(self.clock.seconds, 5)

    def test_unavailable_channel_fails_closed(self):
        result = self.evaluate(GateStorage(StorageError("storage_metadata_http_403")))[-1]
        self.assertEqual(result["status"], "gate_unavailable")
        self.assertTrue(result["action_prevented"])

    def test_replayed_mismatched_or_forged_shape_never_allows(self):
        changes = [
            {field: "mismatched"} for field in CORRELATION_FIELDS
        ] + [
            {"provenance": "model"}, {"decision": "approved"}, {"workflow_execution_id": ""},
            {"policy_revision": True}, {"policy_revision": 0}, {"schema_version": True},
            {"unexpected": "value"}, {"workflow_id": "other-workflow"}, {"policy_id": "other-policy"},
            {"policy_revision": 2}, {"decided_at": "2026-10-13T00:00:00Z"},
            {"decided_at": "2026-10-15T00:00:00Z"}, {"expires_at": "2026-10-15T00:00:00Z"},
            {"expires_at": "2026-10-14T00:00:00Z"}, {"expires_at": "2026-10-14T00:00:05"},
        ]
        for change in changes:
            with self.subTest(change=change):
                result = self.evaluate(GateStorage(lambda request: {**decision_for(request, "allow"), **change}))[-1]
                self.assertEqual(result["status"], "invalid_decision")
                self.assertTrue(result["action_prevented"])
                self.assertNotIn("decision", result)

    def test_generation_pin_required(self):
        class UnpinnedStorage(GateStorage):
            def read_json(self, *args, **kwargs):
                value, resource = super().read_json(*args, **kwargs)
                resource.pop("version_binding")
                return value, resource
        result = self.evaluate(UnpinnedStorage("allow"))[-1]
        self.assertEqual(result["status"], "invalid_decision")
        self.assertTrue(result["action_prevented"])

    def test_runtime_cannot_use_own_writable_bucket_as_control_channel(self):
        with self.assertRaisesRegex(ValueError, "separate"):
            ExportGate(GateStorage(), "same", "same")
        for seconds in (0, 91):
            with self.assertRaises(ValueError):
                ExportGate(GateStorage(), "evidence", "control", seconds)

    def test_gate_has_absolute_run_budget(self):
        clock = FakeClock()
        storage = GateStorage("allow")
        gate = ExportGate(storage, "evidence", "control", 75, clock.now, clock.monotonic, clock.sleep)
        clock.sleep(106)
        run, call, target = fixture()
        result = gate.evaluate(run, call, target, {})
        self.assertEqual(result["status"], "gate_time_budget_exhausted")
        self.assertEqual(storage.created, [])


if __name__ == "__main__":
    unittest.main()
