"""Offline safety checks for the exact demo response identity."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("response_identity", Path(__file__).with_name("response_identity.py"))
identity = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(identity)


class ResponseIdentityTests(unittest.TestCase):
    def journal(self):
        return {"managed_by": "entity-intelligence-native-response", "project_id": identity.PROJECT,
                "service_account": identity.SERVICE_ACCOUNT, "role": identity.ROLE_NAME,
                "bucket": identity.BUCKET, "created": {}, "started_at": "2026-10-14T00:00:00Z"}

    def account(self):
        return {"email": identity.SERVICE_ACCOUNT, "description": identity.MARKER,
                "projectId": identity.PROJECT, "uniqueId": "123"}

    def role(self):
        return {"name": identity.ROLE_NAME, "description": identity.MARKER,
                "includedPermissions": list(identity.PERMISSIONS)}

    def test_bucket_validation_requests_raw_metadata_with_project_number(self):
        with tempfile.TemporaryDirectory() as directory:
            state_path = Path(directory) / "infra/state" / identity.PROJECT / "resources.json"
            state_path.parent.mkdir(parents=True)
            state_path.write_text(json.dumps({"managed_by": "entity-intelligence-demo", "project_id": identity.PROJECT,
                "buckets": {"export": identity.BUCKET}, "resources_created": {"buckets": [identity.BUCKET]}}))
            raw_bucket = {"projectNumber": "123", "name": identity.BUCKET,
                          "labels": {"ei_demo": "agent_service_account"}}
            with patch.object(identity, "DEMO_ROOT", Path(directory)), \
                    patch.object(identity, "gc", side_effect=[{"projectNumber": "123"}, raw_bucket]) as gc:
                identity.require_demo_scope()
            self.assertIn("--raw", gc.call_args.args)

    def test_bucket_validation_rejects_wrong_project_even_if_labels_match(self):
        with tempfile.TemporaryDirectory() as directory:
            state_path = Path(directory) / "infra/state" / identity.PROJECT / "resources.json"
            state_path.parent.mkdir(parents=True)
            state_path.write_text(json.dumps({"managed_by": "entity-intelligence-demo", "project_id": identity.PROJECT,
                "buckets": {"export": identity.BUCKET}, "resources_created": {"buckets": [identity.BUCKET]}}))
            raw_bucket = {"projectNumber": "other", "name": identity.BUCKET,
                          "labels": {"ei_demo": "agent_service_account"}}
            with patch.object(identity, "DEMO_ROOT", Path(directory)), \
                    patch.object(identity, "gc", side_effect=[{"projectNumber": "123"}, raw_bucket]):
                with self.assertRaisesRegex(ValueError, "project’s managed demo|project's managed demo"):
                    identity.require_demo_scope()

    def test_fresh_setup_grants_only_exact_bucket_iam_role_and_exact_sa_impersonation(self):
        bucket_policy = {"bindings": [{"role": identity.ROLE_NAME,
                                       "members": [f"serviceAccount:{identity.SERVICE_ACCOUNT}"]}]}
        account_policy = {"bindings": [{"role": "roles/iam.serviceAccountTokenCreator",
                                        "members": [f"user:{identity.ACCOUNT}"]}]}
        with patch.object(identity, "require_demo_scope", return_value=({"projectNumber": "123456789012"}, {})), \
                patch.object(identity, "load_journal", return_value=self.journal()), \
                patch.object(identity, "write_json") as write, \
                patch.object(identity, "gc", side_effect=[None, None, self.account(), self.role(), {}, {}, {},
                                                         bucket_policy, account_policy]) as gc:
            result = identity.setup()
        commands = [call.args for call in gc.call_args_list]
        self.assertEqual(commands[5], ("storage", "buckets", "add-iam-policy-binding", f"gs://{identity.BUCKET}",
                                       f"--member=serviceAccount:{identity.SERVICE_ACCOUNT}", f"--role={identity.ROLE_NAME}"))
        self.assertEqual(commands[6], ("iam", "service-accounts", "add-iam-policy-binding", identity.SERVICE_ACCOUNT,
                                       f"--member=user:{identity.ACCOUNT}", "--role=roles/iam.serviceAccountTokenCreator", "--condition=None"))
        self.assertFalse(any(command[:2] == ("projects", "add-iam-policy-binding") for command in commands))
        self.assertFalse(any("keys" in command or "remove-iam-policy-binding" in command for command in commands))
        self.assertNotIn("objectCreator", repr(commands))
        self.assertEqual(result["permissions"], sorted(identity.PERMISSIONS))
        self.assertTrue(result["constraints"]["no_project_role_binding"])
        self.assertEqual(write.call_count, 4)

    def test_unmanaged_account_collision_stops_before_any_mutation(self):
        with patch.object(identity, "require_demo_scope", return_value=({}, {})), \
                patch.object(identity, "load_journal", return_value=self.journal()), \
                patch.object(identity, "write_json") as write, \
                patch.object(identity, "gc", side_effect=[self.account(), None]) as gc:
            with self.assertRaisesRegex(ValueError, "unmanaged or replaced"):
                identity.setup()
        self.assertEqual(gc.call_count, 2)
        write.assert_not_called()

    def test_unmanaged_role_collision_stops_before_account_creation(self):
        with patch.object(identity, "require_demo_scope", return_value=({}, {})), \
                patch.object(identity, "load_journal", return_value=self.journal()), \
                patch.object(identity, "write_json") as write, \
                patch.object(identity, "gc", side_effect=[None, self.role()]) as gc:
            with self.assertRaisesRegex(ValueError, "unmanaged or expanded"):
                identity.setup()
        self.assertEqual(gc.call_count, 2)
        write.assert_not_called()

    def test_expanded_existing_role_is_rejected(self):
        journal = self.journal()
        journal["created"]["role"] = "earlier"
        resource = self.role()
        resource["includedPermissions"].append("storage.objects.get")
        with self.assertRaisesRegex(ValueError, "expanded"):
            identity.validate_role(resource, journal)

    def test_recreated_account_with_new_unique_id_is_rejected(self):
        journal = self.journal()
        journal["created"]["service_account"] = "earlier"
        journal["unique_id"] = "original"
        with self.assertRaisesRegex(ValueError, "replaced"):
            identity.validate_account(self.account(), journal)

    def test_foreign_journal_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            value = self.journal()
            value["bucket"] = "production-bucket"
            path.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, "fixed demo scope"):
                identity.load_journal(path)

    def test_mint_keeps_secret_in_return_value_and_explicit_short_lived_scope(self):
        with patch.object(identity, "load_journal", return_value={"configured_at": "earlier"}), \
                patch.object(identity, "gc", return_value="SECRET_ACCESS_TOKEN") as gc, \
                contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(identity.mint_access_token(), "SECRET_ACCESS_TOKEN")
        self.assertEqual(output.getvalue(), "")
        self.assertIn("--lifetime=3600s", gc.call_args.args)
        self.assertIn(f"--impersonate-service-account={identity.SERVICE_ACCOUNT}", gc.call_args.args)

    def test_token_file_private_exclusive_and_not_in_report(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "credential"
            with patch.object(identity, "mint_access_token", return_value="SECRET_ACCESS_TOKEN"):
                result = identity.write_private_token(path)
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                self.assertEqual(path.read_text(), "SECRET_ACCESS_TOKEN")
                self.assertNotIn("SECRET_ACCESS_TOKEN", json.dumps(result))
                with self.assertRaises(FileExistsError):
                    identity.write_private_token(path)

    def test_google_failure_never_contains_token_or_response_body(self):
        result = subprocess.CompletedProcess([], 1, "SECRET_STDOUT", "SECRET_STDERR")
        with patch.object(identity.subprocess, "run", return_value=result):
            with self.assertRaises(RuntimeError) as caught:
                identity.gc("auth", "print-access-token", raw=True)
        self.assertNotIn("SECRET", str(caught.exception))

    def test_permission_error_is_not_classified_as_missing_resource(self):
        result = subprocess.CompletedProcess([], 1, "", "PERMISSION_DENIED")
        with patch.object(identity.subprocess, "run", return_value=result):
            with self.assertRaises(RuntimeError):
                identity.gc("iam", "roles", "describe", identity.ROLE_ID, optional=True)


if __name__ == "__main__":
    unittest.main()
