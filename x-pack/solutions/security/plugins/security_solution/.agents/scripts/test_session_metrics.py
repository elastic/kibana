from __future__ import annotations

import http.client
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock


SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPT = SCRIPT_DIR / "session-token-usage.py"
EXPLORATORY_TESTER_DIR = SCRIPT_DIR.parent / "skills" / "exploratory-tester"
sys.path.insert(0, str(SCRIPT_DIR))

from session_metrics import (  # noqa: E402
    MODEL_PRICES_PATH,
    ModelPrice,
    ModelUsage,
    PriceCatalog,
    TokenTotals,
    build_session_metrics,
    estimate_session_cost,
    fetch_price_catalog,
    find_model_price,
    format_cost,
    format_legacy_usage,
    load_price_catalog,
    parse_transcript,
    render_json_metrics,
    resolve_transcript,
)


def usage_line(
    message_id: str | None,
    model: str | None,
    output_tokens: int,
    cache_write_1h: int = 0,
) -> str:
    message: dict[str, object] = {
        "usage": {
            "input_tokens": 2,
            "output_tokens": output_tokens,
            "cache_creation_input_tokens": 100,
            "cache_read_input_tokens": 1000,
            "cache_creation": {
                "ephemeral_5m_input_tokens": 100 - cache_write_1h,
                "ephemeral_1h_input_tokens": cache_write_1h,
            },
        }
    }
    if message_id is not None:
        message["id"] = message_id
    if model is not None:
        message["model"] = model
    return json.dumps({"type": "assistant", "message": message}) + "\n"


CATALOG = PriceCatalog(
    source="test",
    checked="2026-10-21",
    models={
        "claude-sonnet-5": ModelPrice(2e-6, 1e-5, 2e-7, 2.5e-6),
        "claude-sonnet-5-5": ModelPrice(2e-6, 1e-5, 1e-7, 2.5e-6),
        "claude-fable-5.1": ModelPrice(1e-5, 5e-5, 2.5e-7, 1.25e-5),
    },
)

GH_AW_MODELS = {
    "providers": {
        "anthropic": {
            "models": {
                "claude-sonnet-5-5": {
                    "cost": {
                        "input": "2e-06",
                        "output": "1e-05",
                        "cache_read": "1e-07",
                        "cache_write": "2.5e-06",
                    },
                    "provider_type": "anthropic",
                }
            }
        }
    }
}


class SessionMetricsParserTests(unittest.TestCase):
    def run_script(
        self, *args: str, prices_url: str = ""
    ) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment.pop("CLAUDE_CODE_SESSION_ID", None)
        # Tests never reach the network; an empty URL uses only the local copy.
        environment["MODEL_PRICES_URL"] = prices_url
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

    def test_parse_transcript_counts_each_response_once(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 5)
                + usage_line("msg_1", "claude-sonnet-5-5", 40)
                + usage_line("msg_2", "claude-sonnet-5-5", 7)
                + usage_line("msg_3", "<synthetic>", 0),
                encoding="utf-8",
            )

            result = parse_transcript(transcript)

            self.assertEqual(result.usage_blocks, 2)
            self.assertEqual(result.totals, TokenTotals(4, 47, 200, 2000))
            self.assertEqual(list(result.usage_by_model), ["claude-sonnet-5-5"])

    def test_parse_transcript_keeps_usage_per_model(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 10, cache_write_1h=60)
                + usage_line("msg_2", "claude-sonnet-5", 20),
                encoding="utf-8",
            )

            usage_by_model = parse_transcript(transcript).usage_by_model

            self.assertEqual(
                usage_by_model["claude-sonnet-5-5"].cache_write_1h_tokens, 60
            )
            self.assertEqual(
                usage_by_model["claude-sonnet-5"].totals.output_tokens, 20
            )

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

    def test_find_model_price_matches_exact_then_longest_prefix(self):
        self.assertEqual(
            find_model_price(CATALOG, "claude-sonnet-5-5-medium"),
            CATALOG.models["claude-sonnet-5-5"],
        )
        self.assertEqual(
            find_model_price(CATALOG, "Claude-Fable-5-1"),
            CATALOG.models["claude-fable-5.1"],
        )
        self.assertIsNone(find_model_price(CATALOG, "gemini-3-pro"))

    def test_estimate_cost_bills_one_hour_cache_writes_at_twice_input(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 10, cache_write_1h=60)
                + usage_line("msg_2", "claude-sonnet-5", 20),
                encoding="utf-8",
            )

            cost = estimate_session_cost(parse_transcript(transcript).usage_by_model, CATALOG).usd

            sonnet_5_5 = 2 * 2e-6 + 10 * 1e-5 + 1000 * 1e-7 + 40 * 2.5e-6 + 60 * 4e-6
            sonnet_5 = 2 * 2e-6 + 20 * 1e-5 + 1000 * 2e-7 + 100 * 2.5e-6
            self.assertAlmostEqual(cost, sonnet_5_5 + sonnet_5)
            self.assertEqual(format_cost(0.12345, CATALOG), "usd=0.1235 pricing=2026-10-21")
            self.assertEqual(format_cost(0.00005, CATALOG), "usd=0.0001 pricing=2026-10-21")
            self.assertIsNone(format_cost(0.00004, CATALOG))
            self.assertIsNone(format_cost(0.0, CATALOG))

    def test_estimate_cost_is_unavailable_when_a_model_has_no_price(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            unknown = Path(raw_dir) / "unknown.jsonl"
            unknown.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 10)
                + usage_line("msg_2", "gemini-3-pro", 10),
                encoding="utf-8",
            )
            no_model = Path(raw_dir) / "no_model.jsonl"
            no_model.write_text(usage_line("msg_1", None, 10), encoding="utf-8")

            for transcript in (unknown, no_model):
                usage_by_model = parse_transcript(transcript).usage_by_model
                self.assertIsNone(estimate_session_cost(usage_by_model, CATALOG).usd)
            self.assertIsNone(estimate_session_cost({}, CATALOG).usd)

    def test_model_less_usage_is_left_out_only_below_one_percent_of_the_cost(self):
        cache_reads = ModelUsage(TokenTotals(cache_read_input_tokens=990_000))

        small = estimate_session_cost(
            {"claude-sonnet-5-5": cache_reads, None: ModelUsage(TokenTotals(output_tokens=90))},
            CATALOG,
        )
        self.assertAlmostEqual(small.usd or 0, 990_000 * 1e-7)
        self.assertEqual(small.model_less_tokens_left_out, 90)

        # 1% of the tokens, but about half of the dollars.
        cheap_tokens_dominate = estimate_session_cost(
            {"claude-sonnet-5-5": cache_reads, None: ModelUsage(TokenTotals(output_tokens=10_000))},
            CATALOG,
        )
        self.assertIsNone(cheap_tokens_dominate.usd)
        self.assertEqual(
            cheap_tokens_dominate.unavailable_reason,
            "Usage with no model id is over 1% of the session cost",
        )

        # Priced at claude-sonnet-5's cache read price, the highest in the session.
        highest_price = estimate_session_cost(
            {
                "claude-sonnet-5-5": ModelUsage(TokenTotals(output_tokens=10_000)),
                "claude-sonnet-5": ModelUsage(TokenTotals(input_tokens=1)),
                None: ModelUsage(TokenTotals(cache_read_input_tokens=6_000)),
            },
            CATALOG,
        )
        self.assertIsNone(highest_price.usd)

        unpriced = estimate_session_cost(
            {"gemini-3-pro": cache_reads, None: ModelUsage(TokenTotals(output_tokens=1))},
            CATALOG,
        )
        self.assertEqual(unpriced.unavailable_reason, "No price for every model in the session")

        only_model_less = estimate_session_cost(
            {None: ModelUsage(TokenTotals(input_tokens=5))}, CATALOG
        )
        self.assertEqual(only_model_less.unavailable_reason, "No usage with a model id")

    def test_price_catalog_in_the_repo_is_valid(self):
        catalog = load_price_catalog(MODEL_PRICES_PATH)

        self.assertRegex(catalog.checked, r"^\d{4}-\d{2}-\d{2}$")
        self.assertIn("gh-aw", catalog.source)
        self.assertIsNotNone(find_model_price(catalog, "claude-sonnet-5-5"))

    def test_invalid_price_catalog_is_rejected(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            catalog = Path(raw_dir) / "prices.json"
            catalog.write_text(
                json.dumps(
                    {
                        "source": "test",
                        "checked": "2026-10-21",
                        "models": {"m": {"input": -1, "output": 1}},
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                load_price_catalog(catalog)

    def test_fetch_price_catalog_reads_gh_aw_anthropic_prices(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            models = Path(raw_dir) / "models.json"
            models.write_text(json.dumps(GH_AW_MODELS), encoding="utf-8")
            url = models.as_uri()

            catalog = fetch_price_catalog(url, "2026-10-22")

            self.assertEqual(catalog.source, url)
            self.assertEqual(catalog.checked, "2026-10-22")
            self.assertEqual(
                catalog.models,
                {"claude-sonnet-5-5": ModelPrice(2e-06, 1e-05, 1e-07, 2.5e-06)},
            )

    def test_fetch_price_catalog_rejects_unreadable_or_unexpected_files(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            no_anthropic = Path(raw_dir) / "no_anthropic.json"
            no_anthropic.write_text(
                json.dumps({"providers": {"openai": GH_AW_MODELS["providers"]["anthropic"]}}),
                encoding="utf-8",
            )
            not_json = Path(raw_dir) / "not_json.json"
            not_json.write_text("<html>", encoding="utf-8")
            bad_price = Path(raw_dir) / "bad_price.json"
            bad_price.write_text(
                json.dumps(
                    {"providers": {"anthropic": {"models": {"m": {"cost": {"input": "x", "output": "1"}}}}}}
                ),
                encoding="utf-8",
            )

            for path in (Path(raw_dir) / "missing.json", no_anthropic, not_json, bad_price):
                with self.assertRaises(ValueError):
                    fetch_price_catalog(path.as_uri(), "2026-10-22")

    def test_fetch_price_catalog_skips_entries_without_a_valid_price(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            mixed = json.loads(json.dumps(GH_AW_MODELS))
            mixed["providers"]["anthropic"]["models"].update(
                {
                    "claude-no-cost": {"provider_type": "anthropic"},
                    "claude-bad-output": {"cost": {"input": "1e-06", "output": "free"}},
                }
            )
            models = Path(raw_dir) / "models.json"
            models.write_text(json.dumps(mixed), encoding="utf-8")

            catalog = fetch_price_catalog(models.as_uri(), "2026-10-22")

            self.assertIsNotNone(find_model_price(catalog, "claude-sonnet-5-5"))
            self.assertIsNone(find_model_price(catalog, "claude-no-cost"))
            self.assertIsNone(find_model_price(catalog, "claude-bad-output"))

    def test_unpriced_remote_entry_does_not_fall_through_to_a_shorter_id(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            shorter_id_priced = {
                "providers": {
                    "anthropic": {
                        "models": {
                            "claude-sonnet-5": {"cost": {"input": "2e-06", "output": "1e-05"}},
                            "claude-sonnet-5-5": {"provider_type": "anthropic"},
                        }
                    }
                }
            }
            models = Path(raw_dir) / "models.json"
            models.write_text(json.dumps(shorter_id_priced), encoding="utf-8")

            catalog = fetch_price_catalog(models.as_uri(), "2026-10-22")

            self.assertIsNotNone(find_model_price(catalog, "claude-sonnet-5"))
            self.assertIsNone(find_model_price(catalog, "claude-sonnet-5-5"))
            self.assertIsNone(find_model_price(catalog, "claude-sonnet-5-5-20261001"))

    def test_fetch_price_catalog_turns_a_broken_download_into_a_value_error(self):
        broken = http.client.IncompleteRead(b"{")
        with mock.patch("session_metrics.urllib.request.urlopen", side_effect=broken):
            with self.assertRaises(ValueError):
                fetch_price_catalog("https://example.invalid/models.json", "2026-10-22")

    def test_with_cost_uses_downloaded_prices_and_falls_back_to_the_copy(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 10), encoding="utf-8"
            )
            doubled = json.loads(json.dumps(GH_AW_MODELS))
            doubled["providers"]["anthropic"]["models"]["claude-sonnet-5-5"]["cost"]["output"] = "1"
            models = Path(raw_dir) / "models.json"
            models.write_text(json.dumps(doubled), encoding="utf-8")

            downloaded = self.run_script("--with-cost", str(transcript), prices_url=models.as_uri())
            self.assertEqual(downloaded.returncode, 0, downloaded.stderr)
            cost_line = downloaded.stdout.splitlines()[1]
            self.assertTrue(cost_line.startswith("usd=10.00"), cost_line)
            self.assertTrue(cost_line.endswith(f"pricing={date.today().isoformat()}"), cost_line)

            copy_checked = load_price_catalog(MODEL_PRICES_PATH).checked
            missing_url = (Path(raw_dir) / "missing.json").as_uri()
            fallback = self.run_script("--with-cost", str(transcript), prices_url=missing_url)
            self.assertEqual(fallback.returncode, 0, fallback.stderr)
            self.assertTrue(
                fallback.stdout.splitlines()[1].endswith(f"pricing={copy_checked}"),
                fallback.stdout,
            )
            self.assertIn("using the local copy", fallback.stderr)

            copy_only = self.run_script("--with-cost", str(transcript))
            self.assertEqual(copy_only.stdout, fallback.stdout)
            self.assertEqual(copy_only.stderr, "")

    def test_with_cost_does_not_promise_a_broken_local_copy(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            script_dir = Path(raw_dir) / "scripts"
            script_dir.mkdir()
            for name in (SCRIPT.name, "session_metrics.py"):
                shutil.copy(SCRIPT_DIR / name, script_dir / name)
            (script_dir / "model_prices.json").write_text("{", encoding="utf-8")
            transcript = Path(raw_dir) / "session.jsonl"
            transcript.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 10), encoding="utf-8"
            )
            environment = os.environ.copy()
            environment["MODEL_PRICES_URL"] = (Path(raw_dir) / "missing.json").as_uri()

            result = subprocess.run(
                [sys.executable, str(script_dir / SCRIPT.name), "--with-cost", str(transcript)],
                capture_output=True,
                text=True,
                check=False,
                env=environment,
            )

            self.assertEqual(result.returncode, 2)
            self.assertTrue(result.stdout.startswith("input=2 "), result.stdout)
            self.assertIn("Unable to fetch price catalog", result.stderr)
            self.assertIn("Unable to read price catalog", result.stderr)
            self.assertNotIn("using the local copy", result.stderr)

    def test_with_cost_prints_tokens_and_cost_from_one_read(self):
        with tempfile.TemporaryDirectory() as raw_dir:
            priced = Path(raw_dir) / "priced.jsonl"
            priced.write_text(
                usage_line("msg_1", "claude-sonnet-5-5", 10), encoding="utf-8"
            )
            unpriced = Path(raw_dir) / "unpriced.jsonl"
            unpriced.write_text(
                usage_line("msg_1", "gemini-3-pro", 10), encoding="utf-8"
            )

            result = self.run_script("--with-cost", str(priced))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertRegex(
                result.stdout,
                r"^input=2 output=10 cache_create=100 cache_read=1000 total=1112\n"
                r"usd=\d+\.\d{4} pricing=\d{4}-\d{2}-\d{2}\n$",
            )

            result = self.run_script("--with-cost", str(unpriced))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                result.stdout,
                "input=2 output=10 cache_create=100 cache_read=1000 total=1112\n",
            )

            for model_less_input, expected_stderr in (
                (1, "Left 1 tokens with no model id out of the cost."),
                (3, "Usage with no model id is over 1% of the session cost; cost left out."),
            ):
                with_model_less_line = Path(raw_dir) / "with_model_less_line.jsonl"
                with_model_less_line.write_text(
                    usage_line("msg_1", "claude-sonnet-5-5", 10)
                    + json.dumps(
                        {"type": "assistant", "usage": {"input_tokens": model_less_input}}
                    )
                    + "\n",
                    encoding="utf-8",
                )
                result = self.run_script("--with-cost", str(with_model_less_line))
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertTrue(
                    result.stdout.startswith(f"input={2 + model_less_input} "), result.stdout
                )
                self.assertEqual(
                    len(result.stdout.splitlines()), 2 if model_less_input == 1 else 1
                )
                self.assertIn(expected_stderr, result.stderr)

            cheap_models = Path(raw_dir) / "cheap_models.json"
            cheap_models.write_text(
                json.dumps(
                    {
                        "providers": {
                            "anthropic": {
                                "models": {
                                    "claude-sonnet-5-5": {
                                        "cost": {"input": "1e-12", "output": "1e-12"}
                                    }
                                }
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            result = self.run_script(
                "--with-cost", str(priced), prices_url=cheap_models.as_uri()
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                result.stdout,
                "input=2 output=10 cache_create=100 cache_read=1000 total=1112\n",
            )
            self.assertIn("Cost rounds to zero", result.stderr)

            missing = self.run_script("--with-cost", str(Path(raw_dir) / "missing.jsonl"))
            self.assertEqual(missing.returncode, 1)
            self.assertEqual(missing.stdout, "")

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
