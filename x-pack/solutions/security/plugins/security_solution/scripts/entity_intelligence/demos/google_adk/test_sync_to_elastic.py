import copy
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import sync_to_elastic as sync


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.state = Path(self.temporary.name)
        self.now = sync.date("2026-10-14T23:00:00Z")
        self.run = {
            "run_id": "00000000-0000-4000-8000-000000000001",
            "started_at": "2026-10-14T22:55:00Z",
            "agent": {"provider": "google_adk"},
            "calls": [],
        }
        sync.dump(self.state / "resources.json", {
            "project_id": sync.PROJECT, "service_url": "https://example.run.app"})

    def receipt(self, run, name="receipt"):
        sync.dump(self.state / "invocations" / f"{name}.json", {
            "service_url": "https://example.run.app", "response": run})

    def test_recent_receipts_are_deduplicated_and_old_runs_omitted(self):
        self.receipt(self.run)
        self.receipt(self.run, "duplicate")
        old = {**self.run, "run_id": "00000000-0000-4000-8000-000000000002",
               "started_at": "2026-10-13T22:59:59Z"}
        self.receipt(old, "old")
        self.assertEqual(sync.select_runs(self.state, self.now), [self.run])

    def test_conflicting_run_receipts_fail(self):
        self.receipt(self.run)
        self.receipt({**self.run, "title": "changed"}, "duplicate")
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            sync.select_runs(self.state, self.now)

    def test_different_service_cannot_be_mixed(self):
        self.receipt(self.run)
        path = self.state / "invocations/receipt.json"
        receipt = json.loads(path.read_text())
        receipt["service_url"] = "https://other.run.app"
        sync.dump(path, receipt)
        with self.assertRaisesRegex(ValueError, "different service"):
            sync.select_runs(self.state, self.now)

    def test_exact_requested_run_must_have_recent_receipt(self):
        self.receipt(self.run)
        self.assertEqual(sync.select_runs(self.state, self.now, [self.run["run_id"]]), [self.run])
        with self.assertRaisesRegex(ValueError, "missing"):
            sync.select_runs(self.state, self.now, ["00000000-0000-4000-8000-000000000002"])
        with self.assertRaisesRegex(ValueError, "UUID"):
            sync.select_runs(self.state, self.now, ["../wrong"])

    def test_export_window_expands_only_for_exact_consumed_version(self):
        run = copy.deepcopy(self.run)
        run["calls"] = [{"resource": {"uri": "gs://fixture/case.json", "generation": "42", "sha256": "a" * 64}}]
        change = {"resource": "gs://fixture/case.json", "after": {"generation": "42"},
                  "after_sha256": "a" * 64, "recorded_at": "2026-10-14T22:00:00Z"}
        sync.dump(self.state / "changes/change1/change.json", change)
        sync.dump(self.state / "changes/change2/change.json", {
            **change, "after": {"generation": "43"}, "recorded_at": "2026-10-14T15:00:00Z"})
        start, end = sync.export_window([run], self.state, self.now)
        self.assertEqual(sync.utc(start), "2026-10-14T21:59:00Z")
        self.assertEqual(end, self.now)

    def test_export_window_never_exceeds_24_hours(self):
        run = {**self.run, "started_at": "2026-10-13T23:01:00Z"}
        start, end = sync.export_window([run], self.state, self.now)
        self.assertEqual(end - start, dt.timedelta(hours=24))

    def test_refuses_to_replace_unmanaged_destination(self):
        staging, destination = self.state / "staging", self.state / "elastic_sync"
        staging.mkdir()
        destination.mkdir()
        (destination / "keep.txt").write_text("retain")
        with self.assertRaises(ValueError):
            sync.publish_bundle(staging, destination)
        self.assertTrue((destination / "keep.txt").exists())

    def test_fresh_managed_bundle_replaces_stale_export_files(self):
        staging, destination = self.state / "staging", self.state / "elastic_sync"
        for path in (staging, destination):
            sync.dump(path / sync.MARKER, {"managed_by": "sync_to_elastic"})
        (destination / "run-stale.json").write_text("old")
        (staging / "run-new.json").write_text("new")
        sync.publish_bundle(staging, destination)
        self.assertTrue((destination / "run-new.json").exists())
        self.assertFalse((destination / "run-stale.json").exists())
        self.assertFalse(staging.exists())

    def readback_run(self):
        content = b'{"reference":"DEMO-001"}'
        resource = {"bucket": "example-ei-project-ei-agent-demo-customer", "object": "customers/example-a.json",
                    "uri": "gs://example-ei-project-ei-agent-demo-customer/customers/example-a.json",
                    "generation": "42", "sha256": sync.hashlib.sha256(content).hexdigest()}
        return {**self.run, "calls": [{"id": "native-call", "resource": resource}]}, content

    def test_independent_readback_is_generation_pinned_and_token_not_persisted(self):
        run, content = self.readback_run()
        with patch.object(sync, "run_checked", return_value=b"secret-token"), \
                patch.object(sync, "storage_bytes", return_value=content) as fetch:
            self.assertEqual(sync.verify_resources([run], self.state), (1, 0))
        request, limit = fetch.call_args.args
        self.assertIn("generation=42", request.full_url)
        self.assertEqual(request.get_header("Authorization"), "Bearer secret-token")
        self.assertEqual(limit, 32768)
        report = sync.read_json(self.state / "resource_verification.json")
        self.assertTrue(report["resources"][0]["matches"])
        self.assertNotIn("secret-token", json.dumps(report))

    def test_mismatched_resource_hash_fails_before_import(self):
        run, content = self.readback_run()
        with patch.object(sync, "run_checked", return_value=b"secret-token"), \
                patch.object(sync, "storage_bytes", return_value=content + b"corrupt"):
            with self.assertRaisesRegex(ValueError, "hash conflicts"):
                sync.verify_resources([run], self.state)

    def test_real_upload_receipt_shape_without_bucket_object_fields_is_verified(self):
        content = b'{"summary":"CASE-001 reference DEMO-001"}'
        run = {**self.run, "calls": [{"id": "call_803112", "resource": {
            "bytes": len(content), "generation": "1792013797923679", "operation": "created",
            "sha256": sync.hashlib.sha256(content).hexdigest(),
            "uri": "gs://example-ei-project-ei-agent-demo-export/exports/0c8adb3d-867b-41ee-8573-35b26f16299c/c467903423f396c23b006d0be7aa803f.json",
        }}]}
        with patch.object(sync, "run_checked", return_value=b"secret-token"), \
                patch.object(sync, "storage_bytes", return_value=content) as fetch:
            self.assertEqual(sync.verify_resources([run], self.state), (1, 0))
        url = fetch.call_args.args[0].full_url
        self.assertIn("/b/example-ei-project-ei-agent-demo-export/o/exports%2F", url)
        self.assertIn("generation=1792013797923679", url)

    def test_canonical_uri_cannot_disagree_with_supplied_storage_metadata(self):
        run, _ = self.readback_run()
        run["calls"][0]["resource"]["bucket"] = "another-bucket"
        with patch.object(sync, "run_checked") as authenticate:
            with self.assertRaisesRegex(ValueError, "restricted"):
                sync.verify_resources([run], self.state)
        authenticate.assert_not_called()

    def test_unavailable_readback_is_a_gap_not_verified_content(self):
        run, _ = self.readback_run()
        with patch.object(sync, "run_checked", return_value=b"secret-token"), \
                patch.object(sync, "storage_bytes", side_effect=RuntimeError("HTTP 404")):
            self.assertEqual(sync.verify_resources([run], self.state), (0, 1))
        report = sync.read_json(self.state / "resource_verification.json")
        self.assertEqual(report["resources"], [])
        self.assertEqual(report["unavailable"][0]["status"], "readback_unavailable")


if __name__ == "__main__":
    unittest.main()
