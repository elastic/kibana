import contextlib
import io
import json
import unittest

from core import RunEvidence, Storage, StorageError, encoded, policy_matches, sha256, verified_principal


class FakeResponse:
    def __init__(self, status, value):
        self.status_code = status
        self.content = value if isinstance(value, bytes) else encoded(value)

    def json(self):
        return json.loads(self.content)


class FakeSession:
    def __init__(self, responses):
        self.responses, self.calls = responses, []

    def get(self, url, **kwargs):
        self.calls.append(("get", url, kwargs))
        return self.responses.pop(0)

    def post(self, url, **kwargs):
        self.calls.append(("post", url, kwargs))
        return self.responses.pop(0)

    def close(self):
        pass


class EvidenceTests(unittest.TestCase):
    def test_verified_identity_has_no_owner_inference(self):
        claims = {"iss": "https://accounts.google.com", "aud": "configured-client", "sub": "123",
                  "email": "operator@example.com", "email_verified": True}
        actor = verified_principal(claims, ["configured-client"])
        self.assertEqual(actor["email"], "operator@example.com")
        self.assertNotIn("owner", actor)
        self.assertEqual(actor["human_identity"], "account_level_only")
        claims["email_verified"] = False
        self.assertIsNone(verified_principal(claims, ["configured-client"])["email"])

    def test_wrong_issuer_audience_and_subject_fail(self):
        valid = {"iss": "https://accounts.google.com", "aud": "service", "sub": "123"}
        for modification in ({"iss": "https://example.com"}, {"aud": "other"}, {"sub": ""}):
            with self.assertRaises(ValueError):
                verified_principal({**valid, **modification}, ["service"])

    def test_read_uses_exact_generation_even_if_latest_changes(self):
        raw = b'{"classification":"synthetic","summary":"before edit"}'
        session = FakeSession([FakeResponse(200, {"generation": "111", "size": str(len(raw))}), FakeResponse(200, raw)])
        headers = Storage.headers("run-a", "trace-a", "call-a")
        value, resource = Storage(session).read_json("support", "cases/CASE-001.json", headers)
        self.assertEqual(value["summary"], "before edit")
        self.assertEqual(session.calls[1][2]["params"], {"alt": "media", "generation": "111", "ifGenerationMatch": "111"})
        self.assertEqual(resource["generation"], "111")
        self.assertEqual(resource["sha256"], sha256(raw))
        self.assertEqual(session.calls[0][2]["headers"], headers)
        self.assertEqual(session.calls[1][2]["headers"], headers)

    def test_failed_or_large_storage_reads_do_not_return_data(self):
        for responses in ([FakeResponse(403, {"error": "secret-in-server-response"})],
                          [FakeResponse(200, {"generation": "111", "size": "999999"})],
                          [FakeResponse(200, {"generation": "111", "size": "2"}), FakeResponse(404, {})]):
            with self.assertRaises(StorageError) as error:
                Storage(FakeSession(responses)).read_json("fixture", "object", {})
            self.assertNotIn("secret", str(error.exception))

    def test_exports_are_create_only_and_hash_actual_bytes(self):
        session = FakeSession([FakeResponse(200, {"generation": "222"})])
        value = {"synthetic": True, "summary": "Resolved"}
        resource = Storage(session).create_json("exports", "exports/run/call.json", value, {})
        self.assertEqual(session.calls[0][2]["params"]["ifGenerationMatch"], "0")
        self.assertEqual(resource["sha256"], sha256(session.calls[0][2]["data"]))

    def test_write_error_preserves_provider_status_and_target_without_response_body(self):
        session = FakeSession([FakeResponse(403, {"error": "private-provider-error"})])
        with self.assertRaises(StorageError) as failure:
            Storage(session).create_json("exports", "exports/run/call.json", {"summary": "Example"}, {})
        error = failure.exception
        self.assertEqual(str(error), "storage_write_http_403")
        self.assertEqual(error.http_status, 403)
        self.assertEqual(error.operation, "storage.objects.create")
        self.assertEqual(error.target, {"bucket": "exports", "object": "exports/run/call.json", "uri": "gs://exports/exports/run/call.json"})
        self.assertEqual([item[0] for item in session.calls], ["post"])
        self.assertNotIn("private-provider-error", str(error))
        self.assertIsNone(StorageError("storage_write_http_403").http_status)

    def test_policy_only_records_matches_never_claims_blocking(self):
        policy = {"id": "p", "name": "Policy", "revision": 3, "mode": "monitor", "rules": [
            {"id": "r", "tool": "read_customer_reference", "severity": "high", "title": "Restricted read", "reason": "Restricted"}]}
        self.assertEqual(policy_matches(policy, "read_support_case"), [])
        match = policy_matches(policy, "read_customer_reference")[0]
        self.assertEqual(match["policy_revision"], 3)
        self.assertEqual(match["decision"], "record_and_continue")
        self.assertFalse(match["enforced"])
        with self.assertRaises(ValueError):
            policy_matches({**policy, "mode": "block"}, "read_customer_reference")

    def test_snapshot_separates_requester_runtime_owner_and_assessment(self):
        run = RunEvidence({"subject": "human-account"}, {"email": "runtime@p.iam.gserviceaccount.com"},
                          "Summarize CASE-001", "Case review", "model", "revision", {"mode": "monitor"}, "instructions", "project")
        with contextlib.redirect_stdout(io.StringIO()):
            run.event("run_started", {})
        snapshot = run.snapshot("Summary", "completed", None)
        self.assertNotEqual(snapshot["run_id"], snapshot["session_id"])
        self.assertEqual(snapshot["provenance"]["ownership"], "external_register_required")
        self.assertEqual(snapshot["provenance"]["human_influence"], "assessment_not_automatically_asserted")
        self.assertFalse(snapshot["provenance"]["reasoning_captured"])


if __name__ == "__main__":
    unittest.main()
