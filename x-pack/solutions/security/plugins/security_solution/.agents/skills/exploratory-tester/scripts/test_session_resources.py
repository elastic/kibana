#!/usr/bin/env python3

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
CREATE_SCRIPT = SCRIPT_DIR / "create-flow-spaces.py"
CLEANUP_SCRIPT = SCRIPT_DIR / "cleanup-session-resources.py"
BASE_SPACE_SCRIPT = SCRIPT_DIR / "ensure-base-space.py"
REGISTER_SCRIPT = SCRIPT_DIR / "register-session-resource.py"
DELETE_SCRIPT = SCRIPT_DIR / "delete-flow-spaces.py"
NOISE_SCRIPT = SCRIPT_DIR / "create-noise-index.sh"
POSITIVE_CONTROL = SCRIPT_DIR / "positive-control-alert.md"
FIXTURES_DIR = SCRIPT_DIR / "__tests__" / "fixtures"
OWNED_REUSED_FIXTURE = FIXTURES_DIR / "session-resources-owned-reused.json"
EARLY_EXIT_FIXTURE = FIXTURES_DIR / "session-resources-early-exit.json"
PHASES_DIR = SCRIPT_DIR.parent / "phases"
TEMPLATE_DIR = SCRIPT_DIR.parent / "templates"
sys.path.insert(0, str(SCRIPT_DIR))

from session_resources import (  # noqa: E402
    build_auth_args,
    cleanup_candidates,
    ensure_session_manifest,
    namespaced_flow_space_id,
    register_resource,
)


class SessionResourceContractTests(unittest.TestCase):
    def test_ensure_session_manifest_adds_stable_ownership_fields(self):
        config = {
            "environment": {"type": "stateful-classic", "space_id": "qa"},
            "created_flow_spaces": [],
        }

        session_id = ensure_session_manifest(config, "abc12345")

        self.assertEqual(session_id, "abc12345")
        self.assertEqual(config["session_id"], "abc12345")
        self.assertEqual(config["session_resources"], [])
        self.assertEqual(config["created_flow_spaces"], [])
        self.assertEqual(config["reused_flow_spaces"], [])

    def test_namespaced_flow_space_id_contains_session_marker(self):
        self.assertEqual(
            namespaced_flow_space_id("abc12345", 2),
            "exploratory-testing-abc12345-flow-2",
        )
        self.assertNotEqual(
            namespaced_flow_space_id("abc12345", 2),
            namespaced_flow_space_id("def67890", 2),
        )

        with self.assertRaises(ValueError):
            namespaced_flow_space_id("INVALID!", 2)

    def test_authentication_requires_api_key_for_user_provided_environments(self):
        user_config = {
            "environment": {"type": "user-provided"},
            "credentials": {"username": "browser-user", "password": "secret"},
        }

        with self.assertRaises(ValueError):
            build_auth_args(user_config)

        user_config["credentials"]["api_key"] = "encoded-key"
        self.assertEqual(
            build_auth_args(user_config),
            ["-H", "Authorization: ApiKey encoded-key"],
        )

    def test_managed_environments_can_use_basic_auth_as_fallback(self):
        config = {
            "environment": {"type": "stateful-classic"},
            "credentials": {"username": "elastic", "password": "changeme"},
        }

        self.assertEqual(build_auth_args(config), ["-u", "elastic:changeme"])

    def test_ccs_cleanup_uses_explicit_remote_credentials(self):
        config = {
            "environment": {
                "type": "user-provided",
                "ccs": {
                    "remote": {
                        "credentials": {"api_key": "remote-key"},
                    }
                },
            },
            "credentials": {"api_key": "source-key"},
        }

        self.assertEqual(
            build_auth_args(config, base_url_key="ccs_remote_es_url"),
            ["-H", "Authorization: ApiKey remote-key"],
        )

        del config["environment"]["ccs"]["remote"]["credentials"]
        with self.assertRaisesRegex(ValueError, "remote credentials"):
            build_auth_args(config, base_url_key="ccs_remote_es_url")

    def test_phase_contract_registers_resources_and_cleans_up_unconditionally(self):
        setup = (PHASES_DIR / "0-setup.md").read_text(encoding="utf-8")
        login = (PHASES_DIR / "1-wait-and-login.md").read_text(encoding="utf-8")
        report = (PHASES_DIR / "3-report.md").read_text(encoding="utf-8")
        positive_control = POSITIVE_CONTROL.read_text(encoding="utf-8")
        session_template = (
            TEMPLATE_DIR / "session.example.yaml"
        ).read_text(encoding="utf-8")
        validation_section = setup[
            setup.index("Skip Scout startup. Verify connectivity and API key")
            : setup.index("**No API key available?**")
        ]

        self.assertIn("session_resources", setup)
        self.assertIn("reused_flow_spaces", setup)
        self.assertIn("-X GET", setup)
        self.assertNotIn(
            'SPACE_ID="<Environment.space or exploratory-testing>"',
            validation_section,
        )
        self.assertIn(
            'SPACE_ID="${ENVIRONMENT_SPACE:-exploratory-testing}"',
            validation_section,
        )
        self.assertIn("ensure-base-space.py", login)
        self.assertIn("register-session-resource.py", login)
        self.assertIn(
            "/s/$SPACE_ID/api/actions/connector/$CONNECTOR_ID",
            login,
        )
        self.assertIn("NOISE_INDEX_NAME", login)
        self.assertIn("cleanup-session-resources.py", report)
        self.assertIn("session_id", session_template)
        self.assertIn("ccs_restored", session_template)
        self.assertIn("<SESSION_ID>", positive_control)
        self.assertIn("ccs_remote_es_url", positive_control)
        self.assertIn("--reused", positive_control)
        self.assertIn('RULE_INDEX="${REMOTE_CLUSTER_ALIAS}:$SOURCE_INDEX"', positive_control)
        self.assertIn('DATA_API_KEY="<REMOTE_API_KEY>"', positive_control)
        self.assertIn("Authorization: ApiKey $DATA_API_KEY", positive_control)
        self.assertIn("Authorization: ApiKey $SOURCE_API_KEY", positive_control)
        self.assertIn('"$DATA_ES_URL/$SOURCE_INDEX/_doc', positive_control)
        self.assertIn('"$SOURCE_ES_URL/.alerts-security.alerts-', positive_control)
        self.assertNotIn('SOURCE_ES_URL="<REMOTE_ES_URL>"', positive_control)
        self.assertIn("--kind es_alerts", positive_control)
        self.assertIn("--method POST", positive_control)
        self.assertIn("kibana.alert.rule.uuid", positive_control)

    def test_cleanup_candidates_only_include_owned_resources_with_matching_marker(self):
        config = {"session_id": "abc12345", "session_resources": []}
        with self.assertRaises(ValueError):
            register_resource(
                config,
                kind="kibana_space",
                resource_id="shared-space",
                owned=True,
                endpoint="/api/spaces/space/shared-space",
            )
        with self.assertRaises(ValueError):
            register_resource(
                config,
                kind="es_index",
                resource_id="logs-*",
                owned=True,
                endpoint="/logs-*",
            )

        owned = register_resource(
            config,
            kind="kibana_space",
            resource_id="exploratory-testing-abc12345-flow-1",
            owned=True,
            endpoint="/api/spaces/space/exploratory-testing-abc12345-flow-1",
        )
        register_resource(
            config,
            kind="kibana_space",
            resource_id="exploratory-testing-other-flow-1",
            owned=False,
            endpoint="/api/spaces/space/exploratory-testing-other-flow-1",
        )
        config["session_resources"].append(
            {
                "kind": "kibana_space",
                "id": "exploratory-testing-abc12345-flow-2",
                "owned": True,
                "marker": "wrong-session",
                "endpoint": "/api/spaces/space/exploratory-testing-abc12345-flow-2",
            }
        )

        self.assertEqual(cleanup_candidates(config), [owned])

    def test_create_flow_spaces_separates_created_and_reused_spaces(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "mode": "parallel",
                        "environment": {
                            "type": "user-provided",
                            "url": "https://kibana.example.test",
                            "space_id": "custom-base",
                        },
                        "credentials": {"api_key": "encoded-key"},
                        "flows": [
                            {"name": "created", "isolate": True},
                            {"name": "reused", "isolate": True},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import sys

body = json.loads(sys.argv[sys.argv.index("-d") + 1])
print("ok")
print("200" if body["id"].endswith("flow-1") else "409")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(CREATE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(
                config["created_flow_spaces"],
                ["exploratory-testing-abc12345-flow-1"],
            )
            self.assertEqual(
                config["reused_flow_spaces"],
                ["exploratory-testing-abc12345-flow-2"],
            )
            self.assertEqual(
                config["flows"][0]["space_id"],
                "exploratory-testing-abc12345-flow-1",
            )
            self.assertEqual(
                config["flows"][1]["space_id"],
                "exploratory-testing-abc12345-flow-2",
            )

    def test_flow_space_is_reserved_before_remote_creation(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            config_path.write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "mode": "parallel",
                        "environment": {
                            "type": "user-provided",
                            "url": "https://kibana.example.test",
                            "space_id": "custom-base",
                        },
                        "credentials": {"api_key": "encoded-key"},
                        "flows": [{"name": "created", "isolate": True}],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

config = json.loads(open(os.environ["FAKE_CONFIG"]).read())
resource = config["session_resources"][0]
if resource["state"] != "pending":
    print("resource was not reserved before the API call", file=sys.stderr)
    sys.exit(2)
print("ok")
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CONFIG"] = str(config_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(CREATE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")

    def test_rerunning_flow_setup_preserves_prior_owned_space(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "mode": "parallel",
                        "environment": {
                            "type": "user-provided",
                            "url": "https://kibana.example.test",
                            "space_id": "custom-base",
                        },
                        "credentials": {"api_key": "encoded-key"},
                        "flows": [{"name": "created", "isolate": True}],
                    }
                ),
                encoding="utf-8",
            )
            counter_path = root / "curl-count"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

counter_path = os.environ["FAKE_CURL_COUNTER"]
count = int(open(counter_path).read()) if os.path.exists(counter_path) else 0
with open(counter_path, "w") as counter:
    counter.write(str(count + 1))
body = json.loads(sys.argv[sys.argv.index("-d") + 1])
print("ok")
print("200" if count == 0 else "409")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_COUNTER"] = str(counter_path)

            for _ in range(2):
                result = subprocess.run(
                    [
                        sys.executable,
                        str(CREATE_SCRIPT),
                        "--session-dir",
                        str(session_dir),
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                    env=environment,
                )
                self.assertEqual(result.returncode, 0, result.stderr)

            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(
                config["created_flow_spaces"],
                ["exploratory-testing-abc12345-flow-1"],
            )
            self.assertEqual(config["reused_flow_spaces"], [])
            self.assertTrue(config["session_resources"][0]["owned"])

    def test_flow_space_creation_failure_is_not_reported_as_success(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "mode": "parallel",
                        "environment": {
                            "type": "user-provided",
                            "url": "https://kibana.example.test",
                            "space_id": "custom-base",
                        },
                        "credentials": {"api_key": "encoded-key"},
                        "flows": [{"name": "failed", "isolate": True}],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print("error")
print("500")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(CREATE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertNotEqual(result.returncode, 0)

    def test_base_space_validation_is_read_only_and_records_reuse(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "user-provided",
                            "url": "https://kibana.example.test",
                            "space_id": "custom-base",
                        },
                        "credentials": {"api_key": "encoded-key"},
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import os
import sys

Path = os.environ["FAKE_CURL_LOG"]
with open(Path, "w", encoding="utf-8") as log:
    log.write(" ".join(sys.argv[1:]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            log_path = root / "curl.log"
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_LOG"] = str(log_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(BASE_SPACE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("-X GET", log_path.read_text(encoding="utf-8"))
            self.assertNotIn("-X POST", log_path.read_text(encoding="utf-8"))
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(config["session_resources"][0]["owned"], False)
            self.assertTrue(config["session_resources"][0]["protected"])

    def test_noise_index_is_registered_before_bulk_failure(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "stateful-classic",
                            "es_url": "http://localhost:9220",
                        },
                        "session_resources": [],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import sys

method = sys.argv[sys.argv.index("-X") + 1]
print("200" if method == "PUT" else "500")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    "bash",
                    str(NOISE_SCRIPT),
                    "--es-url",
                    "http://localhost:9220",
                    "--username",
                    "elastic",
                    "--password",
                    "changeme",
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertNotEqual(result.returncode, 0)
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(
                config["session_resources"][0]["id"],
                "logs-exploratory.noise-abc12345-000001",
            )
            self.assertTrue(config["session_resources"][0]["owned"])

    def test_rerunning_noise_setup_preserves_prior_owned_index(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            config_path.write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "stateful-classic",
                            "es_url": "http://localhost:9220",
                        },
                        "session_resources": [],
                    }
                ),
                encoding="utf-8",
            )
            counter_path = root / "curl-count"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import os
import sys

method = sys.argv[sys.argv.index("-X") + 1]
counter_path = os.environ["FAKE_CURL_COUNTER"]
count = int(open(counter_path).read()) if os.path.exists(counter_path) else 0
if method == "PUT":
    with open(counter_path, "w") as counter:
        counter.write(str(count + 1))
    print("200" if count == 0 else "400")
elif method == "GET":
    print('{"mappings": {}}')
else:
    print("500")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_COUNTER"] = str(counter_path)

            for _ in range(2):
                result = subprocess.run(
                    [
                        "bash",
                        str(NOISE_SCRIPT),
                        "--es-url",
                        "http://localhost:9220",
                        "--username",
                        "elastic",
                        "--password",
                        "changeme",
                        "--session-dir",
                        str(session_dir),
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                    env=environment,
                )
                self.assertNotEqual(result.returncode, 0)

            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")
            self.assertTrue(config["session_resources"][0]["owned"])

    def test_register_resource_cli_updates_the_manifest(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir)
            (session_dir / "config.json").write_text(
                json.dumps({"session_id": "abc12345"}),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(REGISTER_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "exploratory-noise",
                    "--endpoint",
                    "/exploratory-noise",
                    "--base-url",
                    "es_url",
                    "--owned",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(config["session_resources"][0]["kind"], "es_index")
            self.assertEqual(config["session_resources"][0]["owned"], True)
            self.assertEqual(config["session_resources"][0]["base_url"], "es_url")

    def test_register_resource_cli_supports_targeted_alert_cleanup(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir)
            (session_dir / "config.json").write_text(
                json.dumps({"session_id": "abc12345"}),
                encoding="utf-8",
            )
            body = json.dumps(
                {"query": {"term": {"kibana.alert.rule.uuid": "rule-1"}}}
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(REGISTER_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_alerts",
                    "--id",
                    "positive-control-alerts-rule-1",
                    "--endpoint",
                    "/.alerts-security.alerts-qa/_delete_by_query",
                    "--base-url",
                    "es_url",
                    "--method",
                    "POST",
                    "--body-json",
                    body,
                    "--owned",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            resource = config["session_resources"][0]
            self.assertEqual(resource["kind"], "es_alerts")
            self.assertEqual(resource["method"], "POST")
            self.assertEqual(json.loads(resource["body"]), json.loads(body))

    def test_concurrent_resource_registrations_preserve_the_manifest(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir)
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {"type": "stateful-classic"},
                        "session_resources": [],
                    }
                ),
                encoding="utf-8",
            )

            processes = [
                subprocess.Popen(
                    [
                        sys.executable,
                        str(REGISTER_SCRIPT),
                        "--session-dir",
                        str(session_dir),
                        "--kind",
                        "es_index",
                        "--id",
                        f"resource-{index}",
                        "--endpoint",
                        f"/resource-{index}",
                        "--owned",
                    ],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                for index in range(20)
            ]
            results = [process.communicate() for process in processes]

            self.assertTrue(
                all(process.returncode == 0 for process in processes),
                results,
            )
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(
                {resource["id"] for resource in config["session_resources"]},
                {f"resource-{index}" for index in range(20)},
            )

    def test_cleanup_uses_remote_ccs_base_and_omits_kibana_xsrf_for_es(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "stateful-classic",
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {
                                "remote": {
                                    "es_url": "https://remote.es.test",
                                    "credentials": {
                                        "username": "remote-user",
                                        "password": "remote-password",
                                    },
                                }
                            },
                        },
                        "ccs_restored": True,
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "session_resources": [
                            {
                                "kind": "es_index",
                                "id": "remote-index",
                                "owned": True,
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": "/remote-index",
                                "base_url": "ccs_remote_es_url",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            log_path = root / "curl.log"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import os
import sys

with open(os.environ["FAKE_CURL_LOG"], "w", encoding="utf-8") as log:
    log.write(" ".join(sys.argv[1:]))
print("204")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_LOG"] = str(log_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            curl_args = log_path.read_text(encoding="utf-8")
            self.assertIn("https://remote.es.test/remote-index", curl_args)
            self.assertIn("remote-user:remote-password", curl_args)
            self.assertNotIn("kbn-xsrf", curl_args)

    def test_cleanup_executes_targeted_alert_delete_by_query(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            body = json.dumps(
                {"query": {"term": {"kibana.alert.rule.uuid": "rule-1"}}}
            )
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "stateful-classic",
                            "url": "https://kibana.example.test",
                            "es_url": "https://es.example.test",
                        },
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "session_resources": [
                            {
                                "kind": "es_alerts",
                                "id": "positive-control-alerts-rule-1",
                                "owned": True,
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": (
                                    "/.alerts-security.alerts-qa/"
                                    "_delete_by_query"
                                ),
                                "base_url": "es_url",
                                "method": "POST",
                                "body": body,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            log_path = root / "curl.log"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import os
import sys

with open(os.environ["FAKE_CURL_LOG"], "w", encoding="utf-8") as log:
    log.write(" ".join(sys.argv[1:]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_LOG"] = str(log_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            curl_args = log_path.read_text(encoding="utf-8")
            self.assertIn("-X POST", curl_args)
            self.assertIn(body, curl_args)

    def test_cleanup_fails_closed_when_ccs_is_not_restored(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "stateful-classic",
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {
                                "remote_cluster_alias": "remote",
                                "remote": {
                                    "es_url": "https://remote.es.test",
                                    "credentials": {
                                        "username": "remote-user",
                                        "password": "remote-password",
                                    },
                                },
                            },
                        },
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "session_resources": [
                            {
                                "kind": "es_index",
                                "id": "source-index",
                                "owned": True,
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": "/source-index",
                                "base_url": "es_url",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            log_path = root / "curl.log"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import os
import sys

with open(os.environ["FAKE_CURL_LOG"], "w", encoding="utf-8") as log:
    log.write(" ".join(sys.argv[1:]))
print("204")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_LOG"] = str(log_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("CCS", result.stderr)
            self.assertFalse(log_path.exists())

    def test_cleanup_reports_pending_resources_instead_of_succeeding(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir)
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "type": "stateful-classic",
                            "url": "https://kibana.example.test",
                        },
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "session_resources": [
                            {
                                "kind": "kibana_space",
                                "id": "exploratory-testing-abc12345-flow-1",
                                "state": "pending",
                                "owned": False,
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": (
                                    "/api/spaces/space/"
                                    "exploratory-testing-abc12345-flow-1"
                                ),
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("pending", result.stderr.lower())

    def test_legacy_space_cleanup_refuses_without_an_ownership_manifest(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir)
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "environment": {
                            "type": "stateful-classic",
                            "url": "http://localhost:5601",
                        },
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "created_flow_spaces": ["exploratory-testing-flow-1"],
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(DELETE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("legacy", result.stderr.lower())

    def test_cleanup_dry_run_does_not_delete_or_include_reused_resources(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir)
            (session_dir / "config.json").write_text(
                OWNED_REUSED_FIXTURE.read_text(encoding="utf-8"),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--dry-run",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("exploratory-testing-abc12345-flow-1", result.stdout)
            self.assertNotIn("exploratory-testing-abc12345-flow-2", result.stdout)

    def test_cleanup_treats_missing_owned_resources_as_already_gone(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                EARLY_EXIT_FIXTURE.read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print("404")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(
                (session_dir / "config.json").read_text(encoding="utf-8")
            )
            self.assertEqual(
                config["session_resources"][0]["cleanup_status"],
                "already_gone",
            )


if __name__ == "__main__":
    unittest.main()
