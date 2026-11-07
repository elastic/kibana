"""Offline checks for portable and explicit demo configuration."""

import hashlib
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

import demo_config


def config_with(values):
    spec = importlib.util.spec_from_file_location("isolated_demo_config", Path(__file__).with_name("demo_config.py"))
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, values, clear=True):
        spec.loader.exec_module(module)
    return module


class DemoConfigTests(unittest.TestCase):
    def test_example_configuration_cannot_run_cloud_actions(self):
        config = config_with({})
        with patch.dict(os.environ, {}, clear=True), self.assertRaisesRegex(ValueError, "EI_GOOGLE_PROJECT_ID"):
            config.require_cloud_configuration()

    def test_project_account_and_agent_are_derived_without_author_defaults(self):
        env = {"EI_GOOGLE_PROJECT_ID": "review-demo-project", "EI_GOOGLE_ACCOUNT": "reviewer@example.com"}
        config = config_with(env)
        with patch.dict(os.environ, env, clear=True):
            config.require_cloud_configuration()
        self.assertEqual(config.RUNTIME, "ei-agent-demo-runtime@review-demo-project.iam.gserviceaccount.com")
        self.assertEqual(config.BUCKET, "review-demo-project-ei-agent-demo-export")
        self.assertEqual(config.AGENT_ID, "google-adk-" + hashlib.sha256(b"review-demo-project:ei-agent-demo").hexdigest()[:32])

    def test_response_requires_real_saved_policy(self):
        env = {"EI_GOOGLE_PROJECT_ID": "review-demo-project", "EI_GOOGLE_ACCOUNT": "reviewer@example.com"}
        config = config_with(env)
        with patch.dict(os.environ, env, clear=True), self.assertRaisesRegex(ValueError, "EI_GOOGLE_POLICY_ID"):
            config.require_response_configuration()

    def test_response_accepts_explicit_policy_uuid(self):
        env = {"EI_GOOGLE_PROJECT_ID": "review-demo-project", "EI_GOOGLE_ACCOUNT": "reviewer@example.com",
               "EI_GOOGLE_POLICY_ID": "11111111-1111-4111-8111-111111111111"}
        config = config_with(env)
        with patch.dict(os.environ, env, clear=True):
            config.require_response_configuration()

    def test_repository_root_is_discovered_from_checkout(self):
        self.assertTrue((demo_config.REPO / ".nvmrc").is_file())

    def test_workflow_template_uses_configured_project(self):
        import sys
        with patch.object(sys, "path", [str(Path(__file__).parent / "native_response"), *sys.path]):
            import setup_native_response
        with patch.object(setup_native_response, "PROJECT", "review-demo-project"):
            rendered = setup_native_response.workflow_yaml("containment")
        self.assertIn("ei-agent-demo-runtime@review-demo-project.iam.gserviceaccount.com", rendered)
        self.assertNotIn("example-ei-project", rendered)


if __name__ == "__main__":
    unittest.main()
