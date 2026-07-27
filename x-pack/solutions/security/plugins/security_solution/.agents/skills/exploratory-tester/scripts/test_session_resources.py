#!/usr/bin/env python3

import fcntl
import json
import os
import subprocess
import sys
import tempfile
import time
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
BREAK_REMOTE = SCRIPT_DIR / "break-remote-cluster.md"
BREAK_CCS_SCRIPT = SCRIPT_DIR / "break-remote-cluster.py"
CAPTURE_CCS_SCRIPT = SCRIPT_DIR / "capture-remote-cluster.py"
RESTORE_CCS_SCRIPT = SCRIPT_DIR / "restore-remote-cluster.py"
RECONCILE_SCRIPT = SCRIPT_DIR / "reconcile-session-resource.py"
RESTORE_CLEANUP_SCRIPT = SCRIPT_DIR / "restore-and-cleanup-session.py"
FIXTURES_DIR = SCRIPT_DIR / "__tests__" / "fixtures"
OWNED_REUSED_FIXTURE = FIXTURES_DIR / "session-resources-owned-reused.json"
EARLY_EXIT_FIXTURE = FIXTURES_DIR / "session-resources-early-exit.json"
PHASES_DIR = SCRIPT_DIR.parent / "phases"
TEMPLATE_DIR = SCRIPT_DIR.parent / "templates"
EMPTY_CCS_SETTINGS = {"persistent": {}, "transient": {}}
PERSISTENT_CCS_SETTINGS = {
    "persistent": {
        "cluster": {
            "remote": {
                "remote": {
                    "mode": "proxy",
                    "proxy_address": "remote.example.test:9400",
                }
            }
        }
    },
    "transient": {},
}
TRANSIENT_CCS_SETTINGS = {
    "persistent": {},
    "transient": {
        "cluster": {
            "remote": {
                "remote": {
                    "mode": "sniff",
                    "seeds": ["remote.example:9300"],
                }
            }
        }
    },
}
sys.path.insert(0, str(SCRIPT_DIR))

from session_resources import (  # noqa: E402
    acquire_ccs_deployment_lease,
    build_auth_args,
    ccs_cleanup_blocked,
    ccs_deployment_lease_path,
    ccs_deployment_lock_path,
    cleanup_candidates,
    ensure_session_manifest,
    namespaced_flow_space_id,
    read_ccs_deployment_lease,
    reconcile_pending_resource,
    register_resource,
    release_ccs_deployment_lease,
    run_curl,
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

    def test_ccs_cleanup_blocks_captured_and_pending_mutation_states(self):
        config = {
            "environment": {"ccs": {"remote_cluster_alias": "remote"}},
            "ccs_restore": {},
        }
        for state in ("captured", "mutation_pending", "modified"):
            config["ccs_state"] = state
            self.assertTrue(ccs_cleanup_blocked(config))

        config["ccs_state"] = "unchanged"
        self.assertTrue(ccs_cleanup_blocked(config))
        config.pop("ccs_restore")
        self.assertFalse(ccs_cleanup_blocked(config))
        config["ccs_restore"] = {}
        config["environment"] = {}
        self.assertTrue(ccs_cleanup_blocked(config))

    def test_reconcile_pending_resource_transitions_by_probe_status(self):
        config = {
            "session_id": "abc12345",
            "session_resources": [],
        }
        register_resource(
            config,
            kind="es_index",
            resource_id="created-index",
            owned=False,
            state="pending",
            endpoint="/created-index",
            base_url="es_url",
        )

        self.assertEqual(
            reconcile_pending_resource(
                config,
                kind="es_index",
                resource_id="created-index",
                endpoint="/created-index",
                base_url="es_url",
                http_code="200",
            ),
            "owned",
        )
        self.assertTrue(config["session_resources"][0]["owned"])

        register_resource(
            config,
            kind="es_index",
            resource_id="absent-index",
            owned=False,
            state="pending",
            endpoint="/absent-index",
            base_url="es_url",
        )
        self.assertEqual(
            reconcile_pending_resource(
                config,
                kind="es_index",
                resource_id="absent-index",
                endpoint="/absent-index",
                base_url="es_url",
                http_code="404",
            ),
            "removed",
        )
        self.assertNotIn(
            "absent-index",
            {resource["id"] for resource in config["session_resources"]},
        )

        register_resource(
            config,
            kind="es_index",
            resource_id="unknown-index",
            owned=False,
            state="pending",
            endpoint="/unknown-index",
            base_url="es_url",
        )
        self.assertEqual(
            reconcile_pending_resource(
                config,
                kind="es_index",
                resource_id="unknown-index",
                endpoint="/unknown-index",
                base_url="es_url",
                http_code="500",
            ),
            "pending",
        )

    def test_capture_remote_cluster_persists_only_writable_restore_fields(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "unchanged",
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import sys

if "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy": "old.remote.test:9400",
                        "skip_unavailable": "false",
                    }
                }
            }
        },
        "transient": {},
    }))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "isConnected": True,
        "securityModel": "api_key",
        "skipUnavailable": False,
        "proxyAddress": "old.remote.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "isConfiguredByNode": False,
        "hasDeprecatedProxySetting": True,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            restore = config["ccs_restore"]
            self.assertEqual(restore["endpoint"], "/api/remote_clusters/remote")
            self.assertEqual(
                restore["payload"],
                {
                    "skipUnavailable": False,
                    "mode": "proxy",
                    "seeds": None,
                    "nodeConnections": None,
                    "proxyAddress": "old.remote.test:9400",
                    "proxySocketConnections": 3,
                    "serverName": None,
                },
            )
            self.assertEqual(
                restore["provenance"],
                {
                    "is_configured_by_node": False,
                    "has_deprecated_proxy_setting": True,
                    "configuration_layer": "persistent",
                    "settings": {
                        "persistent": {
                            "cluster": {
                                "remote": {
                                    "remote": {
                                        "mode": "proxy",
                                        "proxy": "old.remote.test:9400",
                                        "skip_unavailable": "false",
                                    }
                                }
                            }
                        },
                        "transient": {},
                    },
                },
            )
            self.assertNotIn("isConnected", restore["payload"])
            self.assertNotIn("securityModel", restore["payload"])

    def test_capture_remote_cluster_preserves_transient_settings_layer(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "unchanged",
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import sys

if "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {},
        "transient": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "sniff",
                        "seeds": ["remote.example:9300"],
                    }
                }
            }
        },
    }))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "sniff",
        "isConnected": True,
        "skipUnavailable": False,
        "seeds": ["remote.example:9300"],
        "nodeConnections": 3,
        "proxyAddress": None,
        "proxySocketConnections": None,
        "serverName": None,
        "isConfiguredByNode": False,
        "hasDeprecatedProxySetting": False,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            restore = config["ccs_restore"]
            self.assertEqual(restore["provenance"]["configuration_layer"], "transient")
            self.assertEqual(restore["provenance"]["settings"], TRANSIENT_CCS_SETTINGS)
            self.assertEqual(config["ccs_state"], "captured")

    def test_capture_does_not_hold_config_lock_during_http(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "unchanged",
                    }
                ),
                encoding="utf-8",
            )
            started_marker = root / "curl-started"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys
import time

if not os.path.exists(os.environ["STARTED_MARKER"]):
    open(os.environ["STARTED_MARKER"], "w").close()
    time.sleep(2)
if "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy": "old.remote.test:9400",
                        "skip_unavailable": "false",
                    }
                }
            }
        },
        "transient": {},
    }))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "isConnected": True,
        "skipUnavailable": False,
        "proxyAddress": "old.remote.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "seeds": None,
        "nodeConnections": None,
        "isConfiguredByNode": False,
        "hasDeprecatedProxySetting": True,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["STARTED_MARKER"] = str(started_marker)

            capture_process = subprocess.Popen(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--alias",
                    "remote",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=environment,
            )
            deadline = time.monotonic() + 2
            while not started_marker.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(started_marker.exists())

            register_result = subprocess.run(
                [
                    sys.executable,
                    str(REGISTER_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "lock-test-index",
                    "--endpoint",
                    "/lock-test-index",
                    "--base-url",
                    "es_url",
                    "--owned",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
                timeout=1.5,
            )
            capture_stdout, capture_stderr = capture_process.communicate(timeout=5)

            self.assertEqual(register_result.returncode, 0, register_result.stderr)
            self.assertEqual(
                capture_process.returncode,
                0,
                capture_stderr or capture_stdout,
            )
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["ccs_state"], "captured")
            self.assertIn(
                "lock-test-index",
                {resource["id"] for resource in config["session_resources"]},
            )

    def test_run_curl_enforces_max_time_on_hung_requests(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import time
time.sleep(5)
print("{}")
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            started = time.monotonic()
            with self.assertRaises(TimeoutError):
                run_curl(
                    ["curl", "-s", "-w", "\n%{http_code}", "https://example.test"],
                    connect_timeout_seconds=1,
                    max_time_seconds=0.5,
                    env=environment,
                )
            self.assertLess(time.monotonic() - started, 3)

    def test_restore_times_out_when_curl_hangs(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "modified",
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": {
                                "skipUnavailable": False,
                                "mode": "proxy",
                                "seeds": None,
                                "nodeConnections": None,
                                "proxyAddress": "remote.example.test:9400",
                                "proxySocketConnections": 3,
                                "serverName": None,
                            },
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": False,
                                "configuration_layer": "persistent",
                                "settings": PERSISTENT_CCS_SETTINGS,
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import time
time.sleep(10)
print("{}")
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(root / "locks")
            started = time.monotonic()
            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--timeout-seconds",
                    "1",
                    "--poll-interval-seconds",
                    "0",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
                timeout=8,
            )
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertLess(time.monotonic() - started, 6)
            self.assertIn("timed out", (result.stderr or result.stdout).lower())

    def test_capture_rejects_inconsistent_api_and_settings_reads(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "unchanged",
                    }
                ),
                encoding="utf-8",
            )
            counter = root / "curl-count"
            counter.write_text("0", encoding="utf-8")
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

count_path = os.environ["CURL_COUNT"]
count = int(open(count_path, encoding="utf-8").read() or "0") + 1
open(count_path, "w", encoding="utf-8").write(str(count))
if "_cluster/settings" in " ".join(sys.argv):
    proxy = "first.remote.test:9400" if count <= 2 else "second.remote.test:9400"
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": proxy,
                    }
                }
            }
        },
        "transient": {},
    }))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "isConnected": True,
        "skipUnavailable": False,
        "proxyAddress": "first.remote.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "seeds": None,
        "nodeConnections": None,
        "isConfiguredByNode": False,
        "hasDeprecatedProxySetting": False,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["CURL_COUNT"] = str(counter)
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(root / "locks")

            result = subprocess.run(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn("changed during capture", result.stderr.lower())
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["ccs_state"], "unchanged")
            self.assertNotIn("ccs_restore", config)

    def test_reconcile_does_not_hold_config_lock_during_http(self):
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
                            "es_url": "https://es.example.test",
                        },
                        "credentials": {"api_key": "test-key"},
                        "session_resources": [
                            {
                                "kind": "es_index",
                                "id": "pending-index",
                                "endpoint": "/pending-index",
                                "base_url": "es_url",
                                "owned": False,
                                "state": "pending",
                                "marker": "exploratory-tester:abc12345",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            started_marker = root / "curl-started"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import os
import time

if not os.path.exists(os.environ["STARTED_MARKER"]):
    open(os.environ["STARTED_MARKER"], "w").close()
    time.sleep(2)
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["STARTED_MARKER"] = str(started_marker)

            reconcile_process = subprocess.Popen(
                [
                    sys.executable,
                    str(RECONCILE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "pending-index",
                    "--endpoint",
                    "/pending-index",
                    "--base-url",
                    "es_url",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=environment,
            )
            deadline = time.monotonic() + 2
            while not started_marker.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(started_marker.exists())

            register_result = subprocess.run(
                [
                    sys.executable,
                    str(REGISTER_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "lock-test-index",
                    "--endpoint",
                    "/lock-test-index",
                    "--base-url",
                    "es_url",
                    "--owned",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
                timeout=1.5,
            )
            reconcile_stdout, reconcile_stderr = reconcile_process.communicate(
                timeout=5
            )

            self.assertEqual(register_result.returncode, 0, register_result.stderr)
            self.assertEqual(
                reconcile_process.returncode,
                0,
                reconcile_stderr or reconcile_stdout,
            )
            config = json.loads(config_path.read_text(encoding="utf-8"))
            resource_ids = {resource["id"] for resource in config["session_resources"]}
            self.assertIn("lock-test-index", resource_ids)
            pending = next(
                resource
                for resource in config["session_resources"]
                if resource["id"] == "pending-index"
            )
            self.assertEqual(pending["state"], "owned")

    def test_ccs_deployment_lock_is_shared_across_sessions(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            lock_dir = root / "locks"
            lock_dir.mkdir()
            environment = os.environ.copy()
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(lock_dir)

            config_a = {
                "environment": {"es_url": "https://shared.es.test/"},
            }
            config_b = {
                "environment": {"es_url": "https://shared.es.test"},
            }
            path_a = ccs_deployment_lock_path(config_a, env=environment)
            path_b = ccs_deployment_lock_path(config_b, env=environment)
            self.assertEqual(path_a, path_b)

            with path_a.open("a+", encoding="utf-8") as held:
                fcntl.flock(held.fileno(), fcntl.LOCK_EX)
                with path_b.open("a+", encoding="utf-8") as rival:
                    with self.assertRaises(BlockingIOError):
                        fcntl.flock(
                            rival.fileno(),
                            fcntl.LOCK_EX | fcntl.LOCK_NB,
                        )

            session_a = root / "session-a"
            session_b = root / "session-b"
            for session_dir in (session_a, session_b):
                session_dir.mkdir()
                (session_dir / "config.json").write_text(
                    json.dumps(
                        {
                            "session_id": session_dir.name.replace("-", "")[:8]
                            + "abcd",
                            "environment": {
                                "url": "https://source.kibana.test",
                                "es_url": "https://shared.es.test",
                                "ccs": {"remote_cluster_alias": "remote"},
                            },
                            "credentials": {"api_key": "source-key"},
                            "ccs_state": "unchanged",
                        }
                    ),
                    encoding="utf-8",
                )
            started_marker = root / "curl-started"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import time

if not os.path.exists(os.environ["STARTED_MARKER"]):
    open(os.environ["STARTED_MARKER"], "w").close()
    time.sleep(2)
if "_cluster/settings" in " ".join(__import__("sys").argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": "remote.example.test:9400",
                    }
                }
            }
        },
        "transient": {},
    }))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": "remote.example.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": False,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["STARTED_MARKER"] = str(started_marker)

            first = subprocess.Popen(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_a),
                    "--alias",
                    "remote",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=environment,
            )
            deadline = time.monotonic() + 2
            while not started_marker.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(started_marker.exists())

            with self.assertRaises(subprocess.TimeoutExpired):
                subprocess.run(
                    [
                        sys.executable,
                        str(CAPTURE_CCS_SCRIPT),
                        "--session-dir",
                        str(session_b),
                        "--alias",
                        "remote",
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                    env=environment,
                    timeout=1.0,
                )
            first_stdout, first_stderr = first.communicate(timeout=5)
            self.assertEqual(first.returncode, 0, first_stderr or first_stdout)
            # Retry after first release succeeds.
            retry = subprocess.run(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_b),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
                timeout=5,
            )
            self.assertEqual(retry.returncode, 0, retry.stderr)

    def test_ccs_break_lease_blocks_foreign_capture_until_restore(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            lock_dir = root / "locks"
            lock_dir.mkdir()
            session_a = root / "sessiona"
            session_b = root / "sessionb"
            for session_dir, session_id in (
                (session_a, "sessiona1"),
                (session_b, "sessionb1"),
            ):
                session_dir.mkdir()
                (session_dir / "config.json").write_text(
                    json.dumps(
                        {
                            "session_id": session_id,
                            "environment": {
                                "url": "https://source.kibana.test",
                                "es_url": "https://shared.es.test",
                                "ccs": {"remote_cluster_alias": "remote"},
                            },
                            "credentials": {"api_key": "source-key"},
                            "ccs_state": "captured",
                            "ccs_restore": {
                                "remote_cluster_alias": "remote",
                                "endpoint": "/api/remote_clusters/remote",
                                "payload": {
                                    "skipUnavailable": False,
                                    "mode": "proxy",
                                    "seeds": None,
                                    "nodeConnections": None,
                                    "proxyAddress": "remote.example.test:9400",
                                    "proxySocketConnections": 3,
                                    "serverName": None,
                                },
                                "provenance": {
                                    "is_configured_by_node": False,
                                    "has_deprecated_proxy_setting": False,
                                    "configuration_layer": "persistent",
                                    "settings": PERSISTENT_CCS_SETTINGS,
                                },
                            },
                        }
                    ),
                    encoding="utf-8",
                )

            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import sys

if "PUT" in sys.argv:
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": "remote.example.test:9400",
                    }
                }
            }
        },
        "transient": {},
    }))
elif "_remote/info" in " ".join(sys.argv):
    print(json.dumps({"remote": {"connected": True}}))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": "remote.example.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": False,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(lock_dir)

            break_result = subprocess.run(
                [
                    sys.executable,
                    str(BREAK_CCS_SCRIPT),
                    "--session-dir",
                    str(session_a),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertEqual(break_result.returncode, 0, break_result.stderr)
            lease = read_ccs_deployment_lease(
                {
                    "session_id": "sessiona1",
                    "environment": {"es_url": "https://shared.es.test"},
                },
                env=environment,
            )
            self.assertIsNotNone(lease)
            self.assertEqual(lease["session_id"], "sessiona1")

            capture_b = subprocess.run(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_b),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertNotEqual(capture_b.returncode, 0, capture_b.stdout)
            self.assertIn("lease", capture_b.stderr.lower())
            self.assertIn("sessiona1", capture_b.stderr)

            restore_a = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_a),
                    "--timeout-seconds",
                    "5",
                    "--poll-interval-seconds",
                    "0",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertEqual(restore_a.returncode, 0, restore_a.stderr)
            self.assertIsNone(
                read_ccs_deployment_lease(
                    {
                        "session_id": "sessiona1",
                        "environment": {"es_url": "https://shared.es.test"},
                    },
                    env=environment,
                )
            )

            capture_b_retry = subprocess.run(
                [
                    sys.executable,
                    str(CAPTURE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_b),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertEqual(capture_b_retry.returncode, 0, capture_b_retry.stderr)

    def test_restore_keep_lease_and_cleanup_wrapper_release(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            lock_dir = root / "locks"
            lock_dir.mkdir()
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            config = {
                "session_id": "abc12345",
                "environment": {
                    "url": "https://source.kibana.test",
                    "es_url": "https://source.es.test",
                    "ccs": {"remote_cluster_alias": "remote"},
                },
                "credentials": {"api_key": "source-key"},
                "ccs_state": "modified",
                "session_resources": [],
                "ccs_restore": {
                    "remote_cluster_alias": "remote",
                    "endpoint": "/api/remote_clusters/remote",
                    "payload": {
                        "skipUnavailable": False,
                        "mode": "proxy",
                        "seeds": None,
                        "nodeConnections": None,
                        "proxyAddress": "remote.example.test:9400",
                        "proxySocketConnections": 3,
                        "serverName": None,
                    },
                    "provenance": {
                        "is_configured_by_node": False,
                        "has_deprecated_proxy_setting": False,
                        "configuration_layer": "persistent",
                        "settings": PERSISTENT_CCS_SETTINGS,
                    },
                },
            }
            config_path.write_text(json.dumps(config), encoding="utf-8")
            environment = os.environ.copy()
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(lock_dir)
            acquire_ccs_deployment_lease(config, env=environment)

            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import sys

if "PUT" in sys.argv:
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": "remote.example.test:9400",
                    }
                }
            }
        },
        "transient": {},
    }))
elif "_remote/info" in " ".join(sys.argv):
    print(json.dumps({"remote": {"connected": True}}))
else:
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": "remote.example.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": False,
    }]))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            keep_lease = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--keep-lease",
                    "--timeout-seconds",
                    "5",
                    "--poll-interval-seconds",
                    "0",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertEqual(keep_lease.returncode, 0, keep_lease.stderr)
            self.assertEqual(
                json.loads(config_path.read_text(encoding="utf-8"))["ccs_state"],
                "restored",
            )
            self.assertIsNotNone(read_ccs_deployment_lease(config, env=environment))

            # Reset to modified so the wrapper must restore again with --keep-lease.
            refreshed = json.loads(config_path.read_text(encoding="utf-8"))
            refreshed["ccs_state"] = "modified"
            refreshed["ccs_restored"] = False
            config_path.write_text(json.dumps(refreshed), encoding="utf-8")
            acquire_ccs_deployment_lease(refreshed, env=environment)

            wrapper = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertEqual(wrapper.returncode, 0, wrapper.stderr)
            self.assertIn("--keep-lease", RESTORE_CLEANUP_SCRIPT.read_text(encoding="utf-8"))
            self.assertIsNone(read_ccs_deployment_lease(config, env=environment))
            self.assertEqual(
                json.loads(config_path.read_text(encoding="utf-8"))["ccs_state"],
                "restored",
            )

    def test_restore_and_cleanup_ignores_foreign_lease_on_release(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            lock_dir = root / "locks"
            lock_dir.mkdir()
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            config = {
                "session_id": "abc12345",
                "environment": {
                    "url": "https://source.kibana.test",
                    "es_url": "https://source.es.test",
                    "ccs": {"remote_cluster_alias": "remote"},
                },
                "credentials": {"api_key": "source-key"},
                "ccs_state": "restored",
                "ccs_restored": True,
                "session_resources": [],
            }
            config_path.write_text(json.dumps(config), encoding="utf-8")
            environment = os.environ.copy()
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(lock_dir)
            foreign = {
                "session_id": "foreign01",
                "environment": {"es_url": "https://source.es.test"},
            }
            acquire_ccs_deployment_lease(foreign, env=environment)

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                read_ccs_deployment_lease(foreign, env=environment)["session_id"],
                "foreign01",
            )

    def test_restore_and_cleanup_releases_own_lease_when_cleanup_fails(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            lock_dir = root / "locks"
            lock_dir.mkdir()
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            config = {
                "session_id": "abc12345",
                "environment": {
                    "url": "https://source.kibana.test",
                    "es_url": "https://source.es.test",
                    "ccs": {"remote_cluster_alias": "remote"},
                },
                "credentials": {"api_key": "source-key"},
                "ccs_state": "restored",
                "ccs_restored": True,
                "session_resources": [
                    {
                        "kind": "es_index",
                        "id": "owned-index",
                        "endpoint": "/owned-index",
                        "base_url": "es_url",
                        "owned": True,
                        "state": "owned",
                        "marker": "exploratory-tester:abc12345",
                    }
                ],
            }
            config_path.write_text(json.dumps(config), encoding="utf-8")
            environment = os.environ.copy()
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(lock_dir)
            acquire_ccs_deployment_lease(config, env=environment)

            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print("500")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIsNone(read_ccs_deployment_lease(config, env=environment))

    def test_expired_ccs_lease_can_be_taken_over(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            lock_dir = root / "locks"
            lock_dir.mkdir()
            environment = os.environ.copy()
            environment["EXPLORATORY_TESTER_CCS_LOCK_DIR"] = str(lock_dir)
            environment["EXPLORATORY_TESTER_CCS_LEASE_TTL_SECONDS"] = "30"

            stale = {
                "session_id": "stale0001",
                "environment": {"es_url": "https://shared.es.test"},
            }
            lease_path = ccs_deployment_lease_path(stale, env=environment)
            lease_path.write_text(
                json.dumps(
                    {
                        "session_id": "stale0001",
                        "acquired_at": time.time() - 120,
                    }
                )
                + "\n",
                encoding="utf-8",
            )

            takeover = {
                "session_id": "fresh001",
                "environment": {"es_url": "https://shared.es.test"},
            }
            acquire_ccs_deployment_lease(takeover, env=environment)
            lease = read_ccs_deployment_lease(takeover, env=environment)
            self.assertIsNotNone(lease)
            self.assertEqual(lease["session_id"], "fresh001")

            with self.assertRaises(ValueError):
                release_ccs_deployment_lease(
                    stale,
                    env=environment,
                    require_owner=True,
                )
            self.assertFalse(
                release_ccs_deployment_lease(
                    stale,
                    env=environment,
                    require_owner=False,
                )
            )

    def test_ensure_base_space_times_out_hung_curl(self):
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
                            "url": "https://kibana.example.test",
                            "space_id": "exploratory-testing",
                        },
                        "credentials": {"api_key": "test-key"},
                        "session_resources": [],
                        "created_flow_spaces": [],
                        "reused_flow_spaces": [],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import time
time.sleep(5)
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["EXPLORATORY_TESTER_CURL_MAX_TIME"] = "0.5"
            environment["EXPLORATORY_TESTER_CURL_CONNECT_TIMEOUT"] = "0.5"
            started = time.monotonic()
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
                timeout=8,
            )
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertLess(time.monotonic() - started, 4)
            self.assertIn("timed out", (result.stderr or result.stdout).lower())

    def test_reconcile_resource_cli_adopts_a_pending_remote_resource(self):
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
                            "es_url": "https://es.example.test",
                        },
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "session_resources": [
                            {
                                "kind": "es_index",
                                "id": "pending-index",
                                "state": "pending",
                                "owned": False,
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": "/pending-index",
                                "base_url": "es_url",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(RECONCILE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "pending-index",
                    "--endpoint",
                    "/pending-index",
                    "--base-url",
                    "es_url",
                    "--probe-method",
                    "HEAD",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")
            self.assertTrue(config["session_resources"][0]["owned"])

    def test_reconcile_resource_cli_reports_non_pending_resource_cleanly(self):
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
                            "es_url": "https://es.example.test",
                        },
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
                        },
                        "session_resources": [],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(RECONCILE_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "not-pending",
                    "--endpoint",
                    "/not-pending",
                    "--base-url",
                    "es_url",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("Traceback", result.stderr)
            self.assertIn("not pending", result.stderr)

    def test_restore_remote_cluster_reports_missing_snapshot_cleanly(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            session_dir = Path(raw_dir) / "session"
            session_dir.mkdir()
            (session_dir / "config.json").write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_restore": None,
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("Traceback", result.stderr)
            self.assertIn("no durable CCS restore snapshot", result.stderr)

    def test_break_remote_cluster_journals_mutation_before_request(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "captured",
                        "ccs_restored": False,
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": {
                                "skipUnavailable": False,
                                "mode": "proxy",
                                "seeds": None,
                                "nodeConnections": None,
                                "proxyAddress": "remote.example.test:9400",
                                "proxySocketConnections": 3,
                                "serverName": None,
                            },
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": True,
                                "configuration_layer": "persistent",
                                "settings": {
                                    "persistent": {
                                        "cluster": {
                                            "remote": {
                                                "remote": {
                                                    "mode": "proxy",
                                                    "proxy": "remote.example.test:9400",
                                                }
                                            }
                                        }
                                    },
                                    "transient": {},
                                },
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            log_path = root / "curl.log"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

with open(os.environ["FAKE_CURL_LOG"], "w", encoding="utf-8") as log:
    config = json.loads(open(os.environ["SESSION_CONFIG"]).read())
    log.write(config["ccs_state"] + "\\n")
    log.write(" ".join(sys.argv[1:]) + "\\n")
print(json.dumps({"acknowledged": True}))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_LOG"] = str(log_path)
            environment["SESSION_CONFIG"] = str(config_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(BREAK_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["ccs_state"], "modified")
            self.assertEqual(
                log_path.read_text(encoding="utf-8").splitlines()[0],
                "mutation_pending",
            )
            curl_log = log_path.read_text(encoding="utf-8")
            self.assertIn("https://source.es.test/_cluster/settings", curl_log)
            self.assertIn("invalid.broken.example:9400", curl_log)
            self.assertIn('"proxy"', curl_log)

    def test_restore_repairs_captured_snapshot_drift_without_modified_state(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "captured",
                        "ccs_restored": False,
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": {
                                "skipUnavailable": False,
                                "mode": "proxy",
                                "seeds": None,
                                "nodeConnections": None,
                                "proxyAddress": "remote.example.test:9400",
                                "proxySocketConnections": 3,
                                "serverName": None,
                            },
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": False,
                                "configuration_layer": "persistent",
                                "settings": PERSISTENT_CCS_SETTINGS,
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            restored_marker = root / "restored"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

restored = os.path.exists(os.environ["RESTORED_MARKER"])
if "PUT" in sys.argv:
    open(os.environ["RESTORED_MARKER"], "w").close()
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    address = "remote.example.test:9400" if restored else "wrong.example.test:9400"
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": address,
                    }
                }
            }
        },
        "transient": {},
    }))
elif any("api/remote_clusters" in value for value in sys.argv):
    address = "remote.example.test:9400" if restored else "wrong.example.test:9400"
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": address,
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": False,
    }]))
else:
    print(json.dumps({"remote": {"connected": True}}))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["RESTORED_MARKER"] = str(restored_marker)

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--timeout-seconds",
                    "1",
                    "--poll-interval-seconds",
                    "0",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(restored_marker.exists())
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["ccs_state"], "restored")

    def test_break_failure_leaves_mutation_pending_for_cleanup(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "captured",
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": {
                                "skipUnavailable": False,
                                "mode": "proxy",
                                "seeds": None,
                                "nodeConnections": None,
                                "proxyAddress": "remote.example.test:9400",
                                "proxySocketConnections": 3,
                                "serverName": None,
                            },
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": False,
                                "configuration_layer": "persistent",
                                "settings": PERSISTENT_CCS_SETTINGS,
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print('{"error": "request rejected"}')
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
                    str(BREAK_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--alias",
                    "remote",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertNotEqual(result.returncode, 0)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["ccs_state"], "mutation_pending")
            self.assertIn("pending", result.stderr)

    def test_restore_does_not_hold_config_lock_during_polling(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "modified",
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": {
                                "skipUnavailable": False,
                                "mode": "proxy",
                                "seeds": None,
                                "nodeConnections": None,
                                "proxyAddress": "remote.example.test:9400",
                                "proxySocketConnections": 3,
                                "serverName": None,
                            },
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": False,
                                "configuration_layer": "persistent",
                                "settings": PERSISTENT_CCS_SETTINGS,
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            started_marker = root / "curl-started"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys
import time

if not os.path.exists(os.environ["STARTED_MARKER"]):
    open(os.environ["STARTED_MARKER"], "w").close()
    time.sleep(2)
if "PUT" in sys.argv:
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": "remote.example.test:9400",
                    }
                }
            }
        },
        "transient": {},
    }))
elif any("api/remote_clusters" in value for value in sys.argv):
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": "remote.example.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": False,
    }]))
else:
    print(json.dumps({"remote": {"connected": True}}))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["STARTED_MARKER"] = str(started_marker)

            restore_process = subprocess.Popen(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--timeout-seconds",
                    "10",
                    "--poll-interval-seconds",
                    "0",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=environment,
            )
            deadline = time.monotonic() + 2
            while not started_marker.exists() and time.monotonic() < deadline:
                time.sleep(0.01)
            self.assertTrue(started_marker.exists())

            register_result = subprocess.run(
                [
                    sys.executable,
                    str(REGISTER_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--kind",
                    "es_index",
                    "--id",
                    "lock-test-index",
                    "--endpoint",
                    "/lock-test-index",
                    "--base-url",
                    "es_url",
                    "--owned",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
                timeout=1.5,
            )
            restore_stdout, restore_stderr = restore_process.communicate(timeout=8)

            self.assertEqual(register_result.returncode, 0, register_result.stderr)
            self.assertEqual(restore_process.returncode, 0, restore_stderr or restore_stdout)

    def test_restore_remote_cluster_uses_snapshot_and_marks_state_after_verify(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            payload = {
                "skipUnavailable": False,
                "mode": "proxy",
                "seeds": None,
                "nodeConnections": None,
                "proxyAddress": "old.remote.test:9400",
                "proxySocketConnections": 3,
                "serverName": None,
            }
            config_path.write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "modified",
                        "ccs_restored": False,
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": payload,
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": True,
                                "configuration_layer": "persistent",
                                "settings": {
                                    "persistent": {
                                        "cluster": {
                                            "remote": {
                                                "remote": {
                                                    "mode": "proxy",
                                                    "proxy": "old.remote.test:9400",
                                                    "skip_unavailable": "false",
                                                }
                                            }
                                        }
                                    },
                                    "transient": {},
                                },
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            log_path = root / "curl.log"
            counter_path = root / "remote-info-count"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

with open(os.environ["FAKE_CURL_LOG"], "a", encoding="utf-8") as log:
    log.write(" ".join(sys.argv[1:]) + "\\n")
if "PUT" in sys.argv:
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy": "old.remote.test:9400",
                        "skip_unavailable": "false",
                    }
                }
            }
        },
        "transient": {},
    }))
elif any("api/remote_clusters" in value for value in sys.argv):
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": "old.remote.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": True,
        "isConfiguredByNode": False,
    }]))
elif any("_remote/info" in value for value in sys.argv):
    count = int(open(os.environ["REMOTE_INFO_COUNT"]).read()) if os.path.exists(os.environ["REMOTE_INFO_COUNT"]) else 0
    with open(os.environ["REMOTE_INFO_COUNT"], "w", encoding="utf-8") as counter:
        counter.write(str(count + 1))
    print(json.dumps({"remote": {"connected": count >= 1}}))
else:
    print(json.dumps({"remote": {"connected": True}}))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"
            environment["FAKE_CURL_LOG"] = str(log_path)
            environment["REMOTE_INFO_COUNT"] = str(counter_path)

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CCS_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                    "--timeout-seconds",
                    "5",
                    "--poll-interval-seconds",
                    "0",
                ],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["ccs_state"], "restored")
            self.assertTrue(config["ccs_restored"])
            curl_log = log_path.read_text(encoding="utf-8")
            self.assertIn("https://source.es.test/_cluster/settings", curl_log)
            self.assertIn("old.remote.test:9400", curl_log)
            self.assertIn(
                "https://source.kibana.test/api/remote_clusters\n",
                curl_log,
            )
            self.assertNotIn("isConnected", curl_log)
            self.assertNotIn("securityModel", curl_log)

    def test_restore_node_configured_cluster_removes_temporary_override(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            payload = {
                "skipUnavailable": False,
                "mode": "sniff",
                "seeds": ["remote.example.test:9300"],
                "nodeConnections": 3,
                "proxyAddress": None,
                "proxySocketConnections": None,
                "serverName": None,
            }
            config_path.write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "modified",
                        "ccs_restored": False,
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": payload,
                            "provenance": {
                                "is_configured_by_node": True,
                                "has_deprecated_proxy_setting": False,
                                "configuration_layer": "node",
                                "settings": EMPTY_CCS_SETTINGS,
                            },
                        },
                    }
                ),
                encoding="utf-8",
            )
            log_path = root / "curl.log"
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import os
import sys

with open(os.environ["FAKE_CURL_LOG"], "a", encoding="utf-8") as log:
    log.write(" ".join(sys.argv[1:]) + "\\n")
if "DELETE" in sys.argv:
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({"persistent": {}, "transient": {}}))
elif any("api/remote_clusters" in value for value in sys.argv):
    print(json.dumps([{
        "name": "remote",
        "mode": "sniff",
        "skipUnavailable": False,
        "seeds": ["remote.example.test:9300"],
        "nodeConnections": 3,
        "proxyAddress": None,
        "proxySocketConnections": None,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": True,
    }]))
else:
    print(json.dumps({"remote": {"connected": True}}))
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
                    str(RESTORE_CCS_SCRIPT),
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
            self.assertEqual(config["ccs_state"], "restored")
            curl_log = log_path.read_text(encoding="utf-8")
            self.assertIn("https://source.es.test/_cluster/settings", curl_log)
            self.assertNotIn(
                "-X PUT https://source.kibana.test/api/remote_clusters/remote",
                curl_log,
            )

    def test_restore_and_cleanup_restores_ccs_before_cleanup(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            config_path = session_dir / "config.json"
            payload = {
                "skipUnavailable": False,
                "mode": "proxy",
                "seeds": None,
                "nodeConnections": None,
                "proxyAddress": "remote.example.test:9400",
                "proxySocketConnections": 3,
                "serverName": None,
            }
            config_path.write_text(
                json.dumps(
                    {
                        "session_id": "abc12345",
                        "environment": {
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "modified",
                        "ccs_restored": False,
                        "ccs_restore": {
                            "remote_cluster_alias": "remote",
                            "endpoint": "/api/remote_clusters/remote",
                            "payload": payload,
                            "provenance": {
                                "is_configured_by_node": False,
                                "has_deprecated_proxy_setting": False,
                                "configuration_layer": "persistent",
                                "settings": PERSISTENT_CCS_SETTINGS,
                            },
                        },
                        "session_resources": [],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import json
import sys

if "PUT" in sys.argv:
    print(json.dumps({"acknowledged": True}))
elif "_cluster/settings" in " ".join(sys.argv):
    print(json.dumps({
        "persistent": {
            "cluster": {
                "remote": {
                    "remote": {
                        "mode": "proxy",
                        "proxy_address": "remote.example.test:9400",
                    }
                }
            }
        },
        "transient": {},
    }))
elif any("api/remote_clusters" in value for value in sys.argv):
    print(json.dumps([{
        "name": "remote",
        "mode": "proxy",
        "skipUnavailable": False,
        "seeds": None,
        "nodeConnections": None,
        "proxyAddress": "remote.example.test:9400",
        "proxySocketConnections": 3,
        "serverName": None,
        "hasDeprecatedProxySetting": False,
        "isConfiguredByNode": False,
    }]))
else:
    print(json.dumps({"remote": {"connected": True}}))
print("200")
""",
                encoding="utf-8",
            )
            fake_curl.chmod(0o755)
            environment = os.environ.copy()
            environment["PATH"] = f"{root}{os.pathsep}{environment['PATH']}"

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CLEANUP_SCRIPT),
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
            self.assertEqual(config["ccs_state"], "restored")

    def test_restore_and_cleanup_does_not_cleanup_when_ccs_restore_fails(self):
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
                            "url": "https://source.kibana.test",
                            "es_url": "https://source.es.test",
                            "ccs": {"remote_cluster_alias": "remote"},
                        },
                        "credentials": {"api_key": "source-key"},
                        "ccs_state": "modified",
                        "ccs_restored": False,
                        "ccs_restore": None,
                        "session_resources": [
                            {
                                "kind": "es_index",
                                "id": "owned-index",
                                "owned": True,
                                "state": "owned",
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": "/owned-index",
                                "base_url": "es_url",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(RESTORE_CLEANUP_SCRIPT),
                    "--session-dir",
                    str(session_dir),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("blocked", result.stderr.lower())
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")

    def test_phase_contract_registers_resources_and_cleans_up_unconditionally(self):
        setup = (PHASES_DIR / "0-setup.md").read_text(encoding="utf-8")
        login = (PHASES_DIR / "1-wait-and-login.md").read_text(encoding="utf-8")
        report = (PHASES_DIR / "3-report.md").read_text(encoding="utf-8")
        explore = (PHASES_DIR / "2-explore.md").read_text(encoding="utf-8")
        noise = (SCRIPT_DIR / "create-noise-index.sh").read_text(encoding="utf-8")
        positive_control = POSITIVE_CONTROL.read_text(encoding="utf-8")
        break_remote = BREAK_REMOTE.read_text(encoding="utf-8")
        delete_flow_spaces = DELETE_SCRIPT.read_text(encoding="utf-8")
        session_template = (
            TEMPLATE_DIR / "session.example.yaml"
        ).read_text(encoding="utf-8")
        validation_section = setup[
            setup.index("Skip Scout startup.")
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
        self.assertIn(
            'KIBANA_URL="${ENVIRONMENT_URL:?',
            validation_section,
        )
        self.assertIn('API_KEY="${ENVIRONMENT_API_KEY:-}"', validation_section)
        self.assertIn('if [[ -z "$API_KEY" ]]', validation_section)
        self.assertIn("Authorization: ApiKey $API_KEY", validation_section)
        self.assertNotIn("$APIKEY", validation_section)
        self.assertNotIn('"<url>', validation_section)
        self.assertIn("ensure-base-space.py", login)
        self.assertIn("register-session-resource.py", login)
        self.assertIn(
            "/s/$SPACE_ID/api/actions/connector/$CONNECTOR_ID",
            login,
        )
        self.assertIn('--base-url es_url', login)
        self.assertIn('--endpoint "/_security/user/$TEST_USERNAME"', login)
        self.assertIn("USER_PROVISIONING_SKIPPED", login)
        self.assertIn("Do not continue to Phase 2", login)
        self.assertIn("user-provisioning", explore)
        self.assertIn("do not explore", explore)
        self.assertIn("NOISE_INDEX_NAME", login)
        self.assertIn("cleanup-session-resources.py", report)
        self.assertIn("restore-and-cleanup-session.py", explore)
        self.assertLess(
            explore.index("restore-and-cleanup-session.py"),
            explore.index("cleanup-session-resources.py"),
        )
        self.assertIn("ENVIRONMENT_API_KEY", setup)
        self.assertIn("edit_session_config", setup)
        self.assertIn('"ccs_state": "unchanged"', setup)
        self.assertIn('"captured"', setup)
        self.assertIn('"mutation_pending"', setup)
        self.assertIn("ccs_state", report)
        self.assertIn("break-remote-cluster.py", break_remote)
        self.assertIn("deployment-scoped lock", break_remote)
        self.assertIn("EXPLORATORY_TESTER_CCS_LOCK_DIR", break_remote)
        self.assertIn("lease", break_remote.lower())
        self.assertIn("--max-time", noise)
        self.assertIn("--connect-timeout", noise)
        self.assertIn("--max-time", validation_section)
        self.assertIn("--connect-timeout", validation_section)
        self.assertIn("EXPLORATORY_TESTER_CURL_MAX_TIME", validation_section)
        self.assertIn('ccs_state="mutation_pending"', break_remote)
        self.assertIn("capture-remote-cluster.py", break_remote)
        self.assertIn("restore-remote-cluster.py", break_remote)
        self.assertIn('ccs_state="restored"', break_remote)
        self.assertIn("restore-and-cleanup-session.py", delete_flow_spaces)
        self.assertIn("session_id", session_template)
        self.assertIn("ccs_restored", session_template)
        self.assertIn("ccs_restore", setup)
        self.assertIn("isConfiguredByNode", break_remote)
        self.assertIn("hasDeprecatedProxySetting", break_remote)
        self.assertIn("<SESSION_ID>", positive_control)
        self.assertIn("ccs_remote_es_url", positive_control)
        self.assertIn("--reused", positive_control)
        self.assertIn('RULE_INDEX="${REMOTE_CLUSTER_ALIAS}:$SOURCE_INDEX"', positive_control)
        self.assertIn('RULE_OWNERSHIP_FLAG="--owned"', positive_control)
        self.assertIn("RULE_HTTP_STATUS", positive_control)
        self.assertIn('DATA_API_KEY="<REMOTE_API_KEY>"', positive_control)
        self.assertIn("Authorization: ApiKey $DATA_API_KEY", positive_control)
        self.assertIn("Authorization: ApiKey $SOURCE_API_KEY", positive_control)
        self.assertIn('"$DATA_ES_URL/$SOURCE_INDEX/_doc', positive_control)
        self.assertIn('"$SOURCE_ES_URL/.alerts-security.alerts-', positive_control)
        self.assertIn('x-elastic-internal-origin: kibana', positive_control)
        self.assertIn('elastic-api-version: 2023-10-31', positive_control)
        self.assertNotIn('SOURCE_ES_URL="<REMOTE_ES_URL>"', positive_control)
        self.assertIn("--kind es_alerts", positive_control)
        self.assertIn("--method POST", positive_control)
        self.assertIn("kibana.alert.rule.rule_id", positive_control)
        self.assertIn("reconcile-session-resource.py", positive_control)
        self.assertIn('SOURCE_OWNERSHIP_FLAG="--', positive_control)
        self.assertIn("SOURCE_CREATE_RESPONSE", positive_control)
        self.assertIn("SOURCE_DOCUMENT_RESPONSE", positive_control)
        self.assertIn("RUN_SOON_RESPONSE", positive_control)
        self.assertIn("ALERT_POLL_TIMEOUT_SECONDS", positive_control)
        self.assertIn('"errors"', noise)
        rule_section = positive_control[
            positive_control.index("### 2. Create a real query detection rule")
            : positive_control.index("### 3. Force immediate execution")
        ]
        self.assertIn('RULE_ID="positive-control-', positive_control)
        self.assertIn('"rule_id":', rule_section)
        self.assertIn('"$RULE_ID"', rule_section)
        self.assertIn("--kind detection_rule", rule_section)
        self.assertIn("--kind es_alerts", rule_section)
        self.assertIn("--pending", rule_section)
        self.assertLess(
            rule_section.index("--pending"),
            rule_section.index("RULE_RESPONSE"),
        )
        connector_section = login[
            login.index("**Connectors**")
            : login.index("**esArchiver fixtures**")
        ]
        self.assertIn('CONNECTOR_ID="exploratory-tester-$SESSION_ID"', connector_section)
        self.assertIn(
            "/api/actions/connector/$CONNECTOR_ID",
            connector_section,
        )
        self.assertIn("--pending", connector_section)
        self.assertIn("--fail-on-absent", connector_section)
        self.assertIn("AUTH_ARGS", connector_section)
        self.assertIn("session_config_value", login)
        for variable in (
            "ENV_TYPE",
            "KIBANA_URL",
            "ES_URL",
            "API_KEY",
            "USERNAME",
            "PASSWORD",
            "SPACE_ID",
        ):
            self.assertIn(f"{variable}=$(session_config_value", login)
        self.assertIn("AUTH_ARGS=(", login)
        self.assertIn("NOISE_AUTH_ARGS=(", login)
        self.assertIn("TEST_USERNAME=$(session_config_value", login)
        self.assertIn('"/_security/user/$TEST_USERNAME"', login)
        self.assertIn("skipped_setup", login)
        self.assertNotIn(
            "uses SOURCE `SOURCE_ES_URL`.\n"
            "`<remote_cluster_alias>:logs-testing.",
            positive_control,
        )

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

    def test_flow_space_failure_reconciles_a_successful_remote_creation(self):
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
                        "flows": [{"name": "reconciled", "isolate": True}],
                    }
                ),
                encoding="utf-8",
            )
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
import sys

print("created" if "-X" in sys.argv and sys.argv[sys.argv.index("-X") + 1] == "POST" else "")
print("500" if "-X" in sys.argv and sys.argv[sys.argv.index("-X") + 1] == "POST" else "200")
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
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(
                config["flows"][0]["space_id"],
                "exploratory-testing-abc12345-flow-1",
            )
            self.assertEqual(
                config["session_resources"][0]["state"],
                "owned",
            )

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

    def test_noise_index_failure_reconciles_an_index_created_before_response_loss(self):
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
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
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
if method == "POST":
    print('{"errors": false, "items": []}')
    print("200")
else:
    print({"PUT": "500", "HEAD": "200"}.get(method, "500"))
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

            self.assertEqual(result.returncode, 0, result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")
            self.assertIn(
                "NOISE_INDEX_NAME=logs-exploratory.noise-abc12345-000001",
                result.stdout,
            )

    def test_noise_index_bulk_errors_are_failures_even_with_http_200(self):
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
                        "credentials": {
                            "username": "elastic",
                            "password": "changeme",
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
if method == "PUT":
    print("200")
elif method == "POST":
    print('{"errors": true, "items": [{"index": {"status": 429}}]}')
    print("200")
else:
    print("404")
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
            self.assertIn("bulk", result.stderr.lower())
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")

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
                        "ccs_state": "restored",
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
print('{"timed_out": false, "failures": []}')
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

    def test_cleanup_rejects_partial_alert_delete_by_query_response(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            session_dir = root / "session"
            session_dir.mkdir()
            body = json.dumps(
                {"query": {"term": {"kibana.alert.rule.uuid": "rule-1"}}}
            )
            config_path = session_dir / "config.json"
            config_path.write_text(
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
                                "state": "owned",
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
            fake_curl = root / "curl"
            fake_curl.write_text(
                """#!/usr/bin/env python3
print('{"timed_out": true, "failures": [{"reason": "shard failure"}]}')
print("200")
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

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("delete_by_query", result.stderr)
            config = json.loads(config_path.read_text(encoding="utf-8"))
            self.assertEqual(config["session_resources"][0]["state"], "owned")

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
                        "ccs_state": "modified",
                        "ccs_restored": True,
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

    def test_cleanup_allows_ccs_session_before_any_ccs_mutation(self):
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
                        "ccs_state": "unchanged",
                        "ccs_restored": False,
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

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("source-index", log_path.read_text(encoding="utf-8"))

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

    def test_cleanup_still_deletes_owned_resources_when_pending_remains(self):
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
                            "url": "https://kibana.example.test",
                            "es_url": "https://es.example.test",
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
                            },
                            {
                                "kind": "es_index",
                                "id": "owned-index",
                                "state": "owned",
                                "owned": True,
                                "marker": "exploratory-tester:abc12345",
                                "endpoint": "/owned-index",
                                "base_url": "es_url",
                            },
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
            self.assertIn("pending", result.stderr.lower())
            self.assertIn("owned-index", log_path.read_text(encoding="utf-8"))
            config = json.loads(config_path.read_text(encoding="utf-8"))
            owned_resource = next(
                resource
                for resource in config["session_resources"]
                if resource["id"] == "owned-index"
            )
            self.assertEqual(owned_resource["cleanup_status"], "deleted")

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
