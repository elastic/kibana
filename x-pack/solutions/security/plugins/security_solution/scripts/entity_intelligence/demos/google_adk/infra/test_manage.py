"""Local-only checks of safeguards; no gcloud or cloud access."""

import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import urllib.parse

SPEC = importlib.util.spec_from_file_location("ei_infra", Path(__file__).with_name("manage.py"))
manage = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manage)


class InfrastructureTests(unittest.TestCase):
    def test_response_control_grants_runtime_read_only_and_records_owned_bucket(self):
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "configure-response"])
        demo = manage.Demo(args)
        demo.state = {"managed_by": "entity-intelligence-demo", "project_id": "test-project"}
        with patch.object(demo, "gc", side_effect=[{"projectNumber": "123"}, None, {}, {}, {}]) as gc, \
                patch.object(demo, "save"), patch("builtins.print"):
            demo.configure_response()
        self.assertTrue(demo.state["response"]["enabled"])
        grants = [call.args for call in gc.call_args_list if "add-iam-policy-binding" in call.args]
        self.assertEqual(len(grants), 1)
        self.assertIn("--role=roles/storage.objectViewer", grants[0])
        self.assertTrue(demo.created("buckets", "test-project-ei-agent-demo-control"))

    def test_response_refuses_existing_unmanaged_control_bucket(self):
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "configure-response"])
        demo = manage.Demo(args)
        demo.state = {"managed_by": "entity-intelligence-demo", "project_id": "test-project"}
        with patch.object(demo, "gc", side_effect=[{"projectNumber": "123"},
                {"project_number": "123", "labels": {"ei_demo": "agent_service_account"}}]) as gc:
            with self.assertRaisesRegex(ValueError, "unmarked response"):
                demo.configure_response()
        self.assertEqual(gc.call_count, 2)

    def test_invocation_preserves_full_signed_token_and_uses_same_token_for_cloud_run(self):
        with tempfile.TemporaryDirectory() as directory:
            args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                               "--gcloud", "/safe/gcloud", "invoke", "--prompt", "Summarize CASE-001"])
            demo = manage.Demo(args)
            demo.state_dir = Path(directory)
            demo.state = {"managed_by": "entity-intelligence-demo", "project_id": "test-project",
                          "service_url": "https://example.run.app"}
            with patch.object(demo, "gc", return_value="SIGNED_REQUESTER_JWT"), \
                    patch.object(manage.urllib.request, "urlopen") as opener, patch("builtins.print"):
                opener.return_value.__enter__.return_value = io.BytesIO(b'{"run_id":"run-123"}')
                demo.invoke()
            request = opener.call_args.args[0]
            self.assertEqual(request.get_header("X-ei-requester-token"), "SIGNED_REQUESTER_JWT")
            self.assertEqual(request.get_header("X-serverless-authorization"), "Bearer SIGNED_REQUESTER_JWT")
            self.assertIsNone(request.get_header("Authorization"))
            evidence = next((demo.state_dir / "invocations").glob("*.json")).read_text()
            self.assertNotIn("SIGNED_REQUESTER_JWT", evidence)

    def fixture_edit(self, directory):
        fixture = Path(directory) / "source.json"
        content = {**manage.BASE_CASE, "internal_notes": "Prepare the requested support handoff."}
        fixture.write_text(json.dumps(content))
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "edit-support", "--file", str(fixture)])
        demo = manage.Demo(args)
        demo.state_dir = Path(directory) / "state"
        demo.state = {"managed_by": "entity-intelligence-demo", "project_id": "test-project"}
        return demo, fixture.read_bytes()

    def test_edit_records_exact_upload_receipt_and_reads_back_its_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            demo, content = self.fixture_edit(directory)
            before = {"generation": "100", "bucket": demo.buckets["support"], "name": "cases/CASE-001.json"}
            receipt = {**before, "generation": "200", "metageneration": "1", "size": str(len(content)), "etag": "receipt-etag"}
            with patch.object(demo, "gc", side_effect=[before, "SECRET_ACCESS_TOKEN"]) as gc, \
                    patch.object(manage, "storage_bytes", side_effect=[b'{"previous":true}', json.dumps(receipt).encode(), content]) as storage, \
                    patch("builtins.print"):
                demo.edit_support()
            self.assertEqual(gc.call_count, 2)  # No separate latest-object metadata read after upload.
            requests = [call.args[0] for call in storage.call_args_list]
            upload = requests[1]
            self.assertEqual(upload.method, "POST")
            self.assertEqual(upload.data, content)
            self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlsplit(upload.full_url).query)["ifGenerationMatch"], ["100"])
            self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlsplit(requests[2].full_url).query)["generation"], ["200"])
            change_path = next((demo.state_dir / "changes").glob("*/change.json"))
            change = json.loads(change_path.read_text())
            self.assertEqual(change["after"], receipt)
            self.assertEqual(change["write_receipt"]["resource"], receipt)
            self.assertEqual(change["write_receipt"]["precondition_generation"], "100")
            self.assertEqual(change["write_receipt"]["request_change_id"], upload.get_header("X-goog-custom-audit-ei-change-id"))
            self.assertEqual(change["verification"]["generation"], "200")
            self.assertTrue(change["verification"]["matches_uploaded_bytes"])
            self.assertEqual(change["verification"]["sha256"], change["after_sha256"])
            self.assertEqual(change_path.with_name("after.json").read_bytes(), content)
            self.assertNotIn("SECRET_ACCESS_TOKEN", change_path.read_text())

    def test_edit_retains_write_receipt_without_claiming_a_failed_readback_was_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            demo, content = self.fixture_edit(directory)
            before = {"generation": "100", "bucket": demo.buckets["support"], "name": "cases/CASE-001.json"}
            receipt = {**before, "generation": "200", "size": str(len(content))}
            with patch.object(demo, "gc", side_effect=[before, "SECRET_ACCESS_TOKEN"]), \
                    patch.object(manage, "storage_bytes", side_effect=[b'{}', json.dumps(receipt).encode(), RuntimeError("Storage API returned HTTP 503")]):
                with self.assertRaisesRegex(RuntimeError, "HTTP 503"):
                    demo.edit_support()
            change = json.loads(next((demo.state_dir / "changes").glob("*/change.json")).read_text())
            self.assertEqual(change["write_receipt"]["resource"]["generation"], "200")
            self.assertEqual(change["verification"]["status"], "failed")
            self.assertFalse(change["verification"]["matches_uploaded_bytes"])

    def test_storage_error_does_not_echo_access_token_or_response_body(self):
        request = manage.urllib.request.Request("https://storage.googleapis.com/storage/v1/b/demo/o/object",
                                                headers={"Authorization": "Bearer SECRET_ACCESS_TOKEN"})
        error = urllib.error.HTTPError(request.full_url, 412, "SECRET_ACCESS_TOKEN", {}, io.BytesIO(b"SECRET_ACCESS_TOKEN"))
        with patch.object(manage.urllib.request, "build_opener") as factory:
            factory.return_value.open.side_effect = error
            with self.assertRaisesRegex(RuntimeError, "Storage API returned HTTP 412") as context:
                manage.storage_bytes(request, 8192)
        self.assertNotIn("SECRET_ACCESS_TOKEN", str(context.exception))

    def test_all_services_data_access_coverage_is_no_op(self):
        policy = {"etag": "keep", "bindings": [{"role": "roles/viewer", "members": ["user:a@example.com"]}],
                  "auditConfigs": [{"service": "allServices", "auditLogConfigs": [
                      {"logType": "ADMIN_READ"}, {"logType": "DATA_READ"}, {"logType": "DATA_WRITE"}]}]}
        self.assertEqual(manage.merge_storage_audit(policy), policy)

    def test_audit_merge_preserves_conditional_bindings_etag_exemptions_and_other_services(self):
        existing = {"version": 3, "etag": "unchanged-etag", "bindings": [
            {"role": "roles/viewer", "members": ["user:someone@example.com"],
             "condition": {"title": "temporary", "expression": "request.time < timestamp('2027-01-01T00:00:00Z')"}}],
            "auditConfigs": [{"service": "allServices", "auditLogConfigs": [{"logType": "ADMIN_READ"}]},
                             {"service": "storage.googleapis.com", "auditLogConfigs": [
                                 {"logType": "DATA_READ", "exemptedMembers": ["user:exempt@example.com"]}]}]}
        original = copy.deepcopy(existing)
        merged = manage.merge_storage_audit(existing)
        self.assertEqual(existing, original)
        self.assertEqual(merged["bindings"], original["bindings"])
        self.assertEqual(merged["etag"], original["etag"])
        self.assertEqual(merged["version"], 3)
        self.assertEqual(merged["auditConfigs"][0], original["auditConfigs"][0])
        self.assertEqual(merged["auditConfigs"][1]["auditLogConfigs"], [
            {"logType": "DATA_READ", "exemptedMembers": ["user:exempt@example.com"]}, {"logType": "DATA_WRITE"}])
        self.assertEqual(manage.merge_storage_audit(merged), merged)

    def test_audit_merge_adds_service_without_replacing_existing_configuration(self):
        policy = {"bindings": [], "auditConfigs": [{"service": "iam.googleapis.com", "auditLogConfigs": []}]}
        merged = manage.merge_storage_audit(policy)
        self.assertEqual(len(merged["auditConfigs"]), 2)
        self.assertEqual(merged["auditConfigs"][0], policy["auditConfigs"][0])

    def test_export_window_requires_explicit_zone_positive_bounded_range(self):
        self.assertEqual(manage.bounded_window("2026-10-14T12:00:00-06:00", "2026-10-14T19:00:00Z"),
                         ["2026-10-14T18:00:00Z", "2026-10-14T19:00:00Z"])
        for start, end in [("2026-10-14T12:00:00", "2026-10-14T13:00:00"),
                           ("2026-10-14T13:00:00Z", "2026-10-14T12:00:00Z"),
                           ("2026-10-14T12:00:00Z", "2026-10-16T12:00:00Z")]:
            with self.assertRaises(ValueError):
                manage.bounded_window(start, end)

    def test_gcloud_uses_explicit_project_and_account_as_argv_not_shell(self):
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "snapshot"])
        demo = manage.Demo(args)
        with patch.object(manage.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, '{"ok": true}', '')) as run:
            self.assertEqual(demo.gc("projects", "describe", "test-project"), {"ok": True})
            command = run.call_args.args[0]
            self.assertIn("--project=test-project", command)
            self.assertIn("--account=owner@example.com", command)
            self.assertNotIn("shell", run.call_args.kwargs)

    def test_auth_failure_never_prints_token_stdout(self):
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "snapshot"])
        demo = manage.Demo(args)
        with patch.object(manage.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, 'SECRET-TOKEN', 'credential expired')):
            with self.assertRaisesRegex(RuntimeError, "credential expired") as context:
                demo.gc("auth", "print-identity-token", raw=True)
        self.assertNotIn("SECRET-TOKEN", str(context.exception))

    def test_missing_auth_does_not_masquerade_as_missing_resource(self):
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "snapshot"])
        demo = manage.Demo(args)
        with patch.object(manage.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, '', 'PERMISSION_DENIED')):
            with self.assertRaises(RuntimeError):
                demo.gc("projects", "describe", "test-project", optional=True)

    def test_absent_cloud_run_service_is_expected_only_for_optional_reads(self):
        args = manage.parser().parse_args(["--project", "test-project", "--account", "owner@example.com",
                                           "--gcloud", "/safe/gcloud", "snapshot"])
        demo = manage.Demo(args)
        missing = "ERROR: (gcloud.run.services.describe) Cannot find service [ei-agent-demo]"
        with patch.object(manage.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, '', missing)):
            self.assertIsNone(demo.gc("run", "services", "describe", "ei-agent-demo", optional=True))
            with self.assertRaisesRegex(RuntimeError, "Cannot find service"):
                demo.gc("run", "services", "describe", "ei-agent-demo")


if __name__ == "__main__":
    unittest.main()
