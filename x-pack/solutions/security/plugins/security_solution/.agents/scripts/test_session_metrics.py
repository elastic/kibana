import json
import math
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPT = SCRIPT_DIR / "session-token-usage.py"
EXPLORATORY_TESTER_DIR = SCRIPT_DIR.parent / "skills" / "exploratory-tester"
sys.path.insert(0, str(SCRIPT_DIR))

from session_metrics import (  # noqa: E402
    TokenTotals,
    build_session_metrics,
    format_legacy_usage,
    parse_transcript,
    render_json_metrics,
    resolve_transcript,
)


class SessionMetricsParserTests(unittest.TestCase):
    def run_script(self, *args: str) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment.pop("CLAUDE_CODE_SESSION_ID", None)
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            capture_output=True,
            text=True,
            check=False,
            env=environment,
        )

    def test_parse_transcript_supports_message_and_top_level_usage(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                '{"message":{"usage":{"input_tokens":2,"output_tokens":3,'
                '"cache_creation_input_tokens":5,"cache_read_input_tokens":7}}}\n'
                '{"usage":{"input_tokens":11,"output_tokens":13,'
                '"cache_creation_input_tokens":17,"cache_read_input_tokens":19}}\n',
                encoding="utf-8",
            )

            result = parse_transcript(transcript)

            self.assertEqual(result.status, "available")
            self.assertEqual(result.totals, TokenTotals(13, 16, 22, 26))
            self.assertEqual(
                format_legacy_usage(result.totals),
                "input=13 output=16 cache_create=22 cache_read=26 total=77",
            )

    def test_parse_transcript_ignores_malformed_and_invalid_usage_values(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                "not-json\n"
                + json.dumps(
                    {
                        "message": {
                            "usage": {
                                "input_tokens": -1,
                                "output_tokens": math.inf,
                                "cache_creation_input_tokens": "not-a-number",
                                "cache_read_input_tokens": 4,
                            }
                        }
                    }
                )
                + "\n",
                encoding="utf-8",
            )

            result = parse_transcript(transcript)

            self.assertEqual(result.status, "available")
            self.assertEqual(result.totals, TokenTotals(0, 0, 0, 4))

    def test_parse_transcript_reports_empty_and_missing_sources(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            empty = Path(raw_dir) / "empty.jsonl"
            empty.write_text('{"message":{"content":[]}}\n', encoding="utf-8")

            self.assertEqual(parse_transcript(empty).status, "empty")
            self.assertEqual(
                parse_transcript(Path(raw_dir) / "missing.jsonl").status,
                "missing",
            )

    def test_explicit_transcript_resolution_takes_precedence(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            explicit = Path(raw_dir) / "explicit.jsonl"
            explicit.write_text("{}", encoding="utf-8")
            previous_session_id = os.environ.pop("CLAUDE_CODE_SESSION_ID", None)
            try:
                self.assertEqual(resolve_transcript(str(explicit)), explicit)
                self.assertIsNone(resolve_transcript(None))
            finally:
                if previous_session_id is not None:
                    os.environ["CLAUDE_CODE_SESSION_ID"] = previous_session_id

    def test_build_session_metrics_aggregates_scoped_transcripts_and_artifacts(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            (root / "orchestrator.jsonl").write_text(
                '{"message":{"usage":{"input_tokens":2,"output_tokens":3,'
                '"cache_creation_input_tokens":5,"cache_read_input_tokens":7}}}\n',
                encoding="utf-8",
            )
            (root / "worker-1.jsonl").write_text(
                '{"message":{"usage":{"input_tokens":11,"output_tokens":13,'
                '"cache_creation_input_tokens":17,"cache_read_input_tokens":19}}}\n',
                encoding="utf-8",
            )
            (root / "findings-flow-1.md").write_text("abc", encoding="utf-8")
            (root / "screenshots").mkdir()
            (root / "screenshots/step.png").write_bytes(b"1234")
            (root / "detectors.js").write_bytes(b"12345")
            manifest = root / "metrics.json"
            manifest.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "session_root": ".",
                        "transcripts": [
                            {
                                "path": "orchestrator.jsonl",
                                "scope": "orchestrator",
                            },
                            {
                                "path": "worker-1.jsonl",
                                "scope": "worker",
                                "name": "flow-1",
                            },
                        ],
                        "artifacts": [
                            {
                                "path": "findings-flow-1.md",
                                "kind": "findings",
                            },
                            {
                                "path": "screenshots/step.png",
                                "kind": "screenshot",
                            },
                            {
                                "path": "detectors.js",
                                "kind": "detector_source",
                            },
                        ],
                        "payload_bytes": {
                            "tool_input": 101,
                            "tool_output": 202,
                            "browser_events": 303,
                        },
                    }
                ),
                encoding="utf-8",
            )

            metrics = build_session_metrics(manifest, None, None)

            self.assertEqual(metrics["schema_version"], 1)
            self.assertEqual(
                metrics["tokens"]["by_scope"]["worker"]["output_tokens"],
                13,
            )
            self.assertEqual(
                metrics["artifacts"]["by_kind"]["screenshot"]["bytes"],
                4,
            )
            self.assertEqual(
                metrics["payload_bytes"],
                {
                    "status": "available",
                    "tool_input": 101,
                    "tool_output": 202,
                    "browser_events": 303,
                },
            )
            self.assertEqual(metrics["sources"][0]["kind"], "manifest")
            self.assertEqual(metrics["sources"][2]["name"], "flow-1")
            self.assertEqual(
                json.loads(render_json_metrics(metrics)),
                metrics,
            )

    def test_build_session_metrics_marks_unavailable_payloads(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            manifest = root / "metrics.json"
            manifest.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "session_root": ".",
                        "transcripts": [
                            {"path": "missing.jsonl", "scope": "worker"}
                        ],
                        "artifacts": [],
                    }
                ),
                encoding="utf-8",
            )

            metrics = build_session_metrics(manifest, None, None)

            self.assertEqual(
                metrics["payload_bytes"],
                {"status": "not_available"},
            )
            self.assertEqual(metrics["tokens"]["status"], "not_available")
            self.assertEqual(metrics["artifacts"]["status"], "not_available")
            self.assertEqual(metrics["sources"][1]["status"], "missing")

    def test_explicit_transcript_is_not_counted_twice_when_manifest_lists_it(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            transcript = root / "session.jsonl"
            transcript.write_text(
                '{"message":{"usage":{"input_tokens":2,"output_tokens":3,'
                '"cache_creation_input_tokens":5,"cache_read_input_tokens":7}}}\n',
                encoding="utf-8",
            )
            manifest = root / "metrics.json"
            manifest.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "session_root": ".",
                        "transcripts": [
                            {"path": transcript.name, "scope": "orchestrator"}
                        ],
                        "artifacts": [],
                    }
                ),
                encoding="utf-8",
            )

            metrics = build_session_metrics(manifest, transcript, None)

            self.assertEqual(
                metrics["tokens"]["aggregate"],
                {
                    "input_tokens": 2,
                    "output_tokens": 3,
                    "cache_creation_input_tokens": 5,
                    "cache_read_input_tokens": 7,
                    "total": 17,
                },
            )

    def test_duplicate_missing_artifacts_have_one_unavailable_source(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            manifest = root / "metrics.json"
            manifest.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "session_root": ".",
                        "transcripts": [],
                        "artifacts": [
                            {"path": "missing.png", "kind": "screenshot"},
                            {"path": "missing.png", "kind": "screenshot"},
                        ],
                    }
                ),
                encoding="utf-8",
            )

            metrics = build_session_metrics(manifest, None, None)
            artifact_sources = [
                source
                for source in metrics["sources"]
                if source["kind"] == "artifact"
            ]

            self.assertEqual(len(artifact_sources), 1)
            self.assertEqual(artifact_sources[0]["status"], "missing")

    def test_manifest_cannot_read_paths_outside_session_root(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            outside = root.parent / "outside-metrics-fixture.txt"
            outside.write_text("secret", encoding="utf-8")
            manifest = root / "metrics.json"
            manifest.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "session_root": ".",
                        "transcripts": [],
                        "artifacts": [
                            {
                                "path": "../outside-metrics-fixture.txt",
                                "kind": "report",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                build_session_metrics(manifest, None, None)

            outside.unlink()

    def test_session_directory_scan_uses_only_allowlisted_artifacts(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            (root / "findings-flow-1.md").write_bytes(b"123")
            (root / "report.md").write_bytes(b"1234")
            (root / "config.json").write_bytes(b"12345")
            (root / "screenshots").mkdir()
            (root / "screenshots/step.webp").write_bytes(b"123456")
            (root / "videos").mkdir()
            (root / "videos/flow.webm").write_bytes(b"1234567")
            (root / "request-body.json").write_bytes(b"do-not-count")

            metrics = build_session_metrics(None, None, root)

            self.assertEqual(
                metrics["artifacts"]["by_kind"],
                {
                    "configuration": {"files": 1, "bytes": 5},
                    "findings": {"files": 1, "bytes": 3},
                    "report": {"files": 1, "bytes": 4},
                    "screenshot": {"files": 1, "bytes": 6},
                    "video": {"files": 1, "bytes": 7},
                },
            )
            self.assertNotIn("request-body", metrics["artifacts"]["by_kind"])

    def test_manifest_supports_a_declared_artifact_root(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            root = Path(raw_dir)
            artifact_root = root / "artifact-root"
            artifact_root.mkdir()
            (artifact_root / "detectors.js").write_bytes(b"12345")
            manifest = root / "metrics.json"
            manifest.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "session_root": ".",
                        "artifact_root": "artifact-root",
                        "transcripts": [],
                        "artifacts": [
                            {
                                "path": "detectors.js",
                                "kind": "detector_source",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            metrics = build_session_metrics(manifest, None, None)

            self.assertEqual(
                metrics["artifacts"]["by_kind"]["detector_source"]["bytes"],
                5,
            )

    def test_json_mode_is_opt_in(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            tmp_path = Path(raw_dir)
            transcript = tmp_path / "session.jsonl"
            transcript.write_text(
                '{"message":{"usage":{"input_tokens":2,"output_tokens":3,'
                '"cache_creation_input_tokens":5,"cache_read_input_tokens":7}}}\n',
                encoding="utf-8",
            )

            result = self.run_script(str(transcript))
            self.assertEqual(result.returncode, 0)
            self.assertEqual(
                result.stdout,
                "input=2 output=3 cache_create=5 cache_read=7 total=17\n",
            )

            structured = self.run_script(
                str(transcript),
                "--json",
                "--manifest",
                str(tmp_path / "metrics.json"),
            )
            self.assertEqual(structured.returncode, 0)
            self.assertEqual(
                json.loads(structured.stdout)["schema_version"],
                1,
            )

    def test_json_mode_reports_unavailable_inputs_as_json(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            result = self.run_script(
                "--json",
                "--manifest",
                str(Path(raw_dir) / "missing-metrics.json"),
            )

            self.assertEqual(result.returncode, 0)
            metrics = json.loads(result.stdout)
            self.assertEqual(metrics["tokens"]["status"], "not_available")
            self.assertEqual(metrics["payload_bytes"]["status"], "not_available")
            self.assertEqual(metrics["sources"][0]["status"], "missing")

    def test_report_contract_keeps_metrics_separate_from_findings(self):
        report_template = (
            EXPLORATORY_TESTER_DIR / "templates" / "report-format.md"
        ).read_text(encoding="utf-8")
        phase_three = (
            EXPLORATORY_TESTER_DIR / "phases" / "3-report.md"
        ).read_text(encoding="utf-8")

        self.assertIn("**Token usage:**", report_template)
        self.assertIn("**Browser/tool payload bytes:**", report_template)
        self.assertIn("**Session artifact bytes:**", report_template)
        self.assertIn("not available", report_template)
        self.assertIn("## Level 1 — Confirmed Bugs", report_template)
        self.assertIn("## Level 2 — Suspicious", report_template)
        self.assertIn("## Level 3 — Observations", report_template)
        self.assertIn("## Known / Suppressed", report_template)
        self.assertIn("Level 1 findings are never suppressed", phase_three)


if __name__ == "__main__":
    unittest.main()
