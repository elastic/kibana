#!/usr/bin/env python3
"""Tests for Task 7: deterministic report bookkeeping (parse-findings.py /
render-report.py) plus markdown-contract tests for phases/3-report.md and
the finding/report templates.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True

SCRIPT_DIR = Path(__file__).resolve().parent
PARSE_SCRIPT = SCRIPT_DIR / "parse-findings.py"
RENDER_SCRIPT = SCRIPT_DIR / "render-report.py"
FIXTURES_DIR = SCRIPT_DIR / "__tests__" / "fixtures"
BASIC_SESSION = FIXTURES_DIR / "report-session-basic"
BASIC_GOLDEN = FIXTURES_DIR / "report-session-basic-golden.md"
BASIC_NOSUPPRESS_GOLDEN = FIXTURES_DIR / "report-session-basic-nosuppress-golden.md"
PHASES_DIR = SCRIPT_DIR.parent / "phases"
TEMPLATE_DIR = SCRIPT_DIR.parent / "templates"

sys.path.insert(0, str(SCRIPT_DIR))
import importlib.util  # noqa: E402


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


parse_findings = _load_module("parse_findings", PARSE_SCRIPT)
render_report = _load_module("render_report", RENDER_SCRIPT)


def run_parse(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(PARSE_SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def run_render(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(RENDER_SCRIPT), *args],
        capture_output=True,
        text=True,
        check=False,
    )


class DurationParsingTests(unittest.TestCase):
    def test_parses_hours_minutes_seconds(self):
        self.assertEqual(parse_findings.duration_to_seconds("1h 2m 3s"), 3723)

    def test_parses_minutes_seconds(self):
        self.assertEqual(parse_findings.duration_to_seconds("12m 38s"), 758)

    def test_parses_seconds_only(self):
        self.assertEqual(parse_findings.duration_to_seconds("45s"), 45)

    def test_returns_none_for_garbage(self):
        self.assertIsNone(parse_findings.duration_to_seconds("not a duration"))


class SignatureTests(unittest.TestCase):
    def test_identical_facts_different_prose_collide(self):
        sig_a = parse_findings.compute_signature(
            level=2,
            checklist_step_number=1,
            title="Duplicate privilege-check API calls on single flyout open",
            evidence=[
                "Network: `GET internal/security/entity_store/check_privileges` "
                "\u2192 200 (\u00d73, lines 374/468/474 in request log)",
                "Screenshot: `$SESSION_DIR/screenshots/flow1.png`",
            ],
        )
        sig_b = parse_findings.compute_signature(
            level=2,
            checklist_step_number=1,
            title="Duplicate privilege-check API calls on single flyout open",
            evidence=[
                "Network: `GET internal/security/entity_store/check_privileges` "
                "\u2192 200 (\u00d73, seen again in flow 2 trace)",
                "Video: `$SESSION_DIR/videos/flow2.mp4`",
            ],
        )
        self.assertEqual(sig_a, sig_b)

    def test_different_evidence_does_not_collide_despite_shared_opening_prose(self):
        # This is the concrete bug in the old "type + first 100 characters of
        # current_behavior" key: two unrelated findings that happen to open
        # with the same phrase would incorrectly dedup. The structured
        # signature must not do that.
        shared_opening = "Selecting the date range triggers a request that "
        sig_a = parse_findings.compute_signature(
            level=2,
            checklist_step_number=2,
            title="Date range request returns 400",
            evidence=["Network: `POST .../anomaly_overview` \u2192 400"],
        )
        sig_b = parse_findings.compute_signature(
            level=2,
            checklist_step_number=4,
            title="Date range request is duplicated",
            evidence=["Network: `GET .../anomaly_summary` \u2192 200 (\u00d72)"],
        )
        self.assertNotEqual(sig_a, sig_b)
        self.assertTrue(shared_opening)  # documents the scenario being guarded against

    def test_different_checklist_step_does_not_collide(self):
        sig_a = parse_findings.compute_signature(
            level=2, checklist_step_number=1, title="Same title", evidence=["Network: X \u2192 200"]
        )
        sig_b = parse_findings.compute_signature(
            level=2, checklist_step_number=3, title="Same title", evidence=["Network: X \u2192 200"]
        )
        self.assertNotEqual(sig_a, sig_b)

    def test_screenshot_and_video_evidence_excluded_from_signature(self):
        sig_a = parse_findings.compute_signature(
            level=1, checklist_step_number=None, title="T", evidence=["Screenshot: `a.png`"]
        )
        sig_b = parse_findings.compute_signature(
            level=1, checklist_step_number=None, title="T", evidence=["Screenshot: `b.png`"]
        )
        self.assertEqual(sig_a, sig_b)


class ParseFindingsFileTests(unittest.TestCase):
    def test_parses_basic_flow_file(self):
        flow_header, findings = parse_findings.parse_findings_file(
            BASIC_SESSION / "findings-flow-1.md"
        )
        self.assertEqual(flow_header["flow_number"], 1)
        self.assertEqual(flow_header["duration_seconds"], 758)
        self.assertEqual(len(findings), 3)
        levels = sorted(f["level"] for f in findings)
        self.assertEqual(levels, [1, 2, 3])

    def test_missing_level_is_a_hard_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings-flow-1.md"
            path.write_text(
                "<!-- flow: X | started: 2026-01-01T00:00:00Z | ended: "
                "2026-01-01T00:01:00Z | duration: 1m 0s -->\n\n"
                "## Finding: Something broke\n\n"
                "**Flow:** X\n\n### Current behavior\nIt broke.\n\n"
                "### Evidence\n- Console: error\n",
                encoding="utf-8",
            )
            with self.assertRaises(ValueError) as ctx:
                parse_findings.parse_findings_file(path)
            self.assertIn("Level", str(ctx.exception))

    def test_missing_current_behavior_is_a_hard_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings-flow-1.md"
            path.write_text(
                "<!-- flow: X | started: 2026-01-01T00:00:00Z | ended: "
                "2026-01-01T00:01:00Z | duration: 1m 0s -->\n\n"
                "## Finding: Something broke\n\n**Level:** 1\n\n"
                "### Evidence\n- Console: error\n",
                encoding="utf-8",
            )
            with self.assertRaises(ValueError) as ctx:
                parse_findings.parse_findings_file(path)
            self.assertIn("Current behavior", str(ctx.exception))

    def test_missing_flow_header_is_a_hard_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings-flow-1.md"
            path.write_text(
                "## Finding: Something broke\n\n**Level:** 1\n\n"
                "### Current behavior\nIt broke.\n\n### Evidence\n- Console: error\n",
                encoding="utf-8",
            )
            with self.assertRaises(ValueError) as ctx:
                parse_findings.parse_findings_file(path)
            self.assertIn("flow header", str(ctx.exception))

    def test_status_override_marker_is_parsed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings-flow-1.md"
            path.write_text(
                "<!-- flow: X | started: 2026-01-01T00:00:00Z | ended: "
                "2026-01-01T00:01:00Z | duration: 1m 0s -->\n"
                "<!-- status: blocked | reason: ML jobs failed to provision -->\n",
                encoding="utf-8",
            )
            flow_header, findings = parse_findings.parse_findings_file(path)
            self.assertEqual(findings, [])
            self.assertEqual(
                flow_header["status_override"],
                {"status": "blocked", "reason": "ML jobs failed to provision"},
            )

    def test_session_lost_marker_text_is_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings-flow-1.md"
            path.write_text(
                "<!-- flow: X | started: 2026-01-01T00:00:00Z | ended: "
                "2026-01-01T00:01:00Z | duration: 1m 0s -->\n"
                "Browser session lost mid-flow; no further steps attempted.\n",
                encoding="utf-8",
            )
            flow_header, _findings = parse_findings.parse_findings_file(path)
            self.assertTrue(flow_header["session_lost"])

    def test_cli_writes_jsonl_and_reports_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "findings.jsonl"
            result = run_parse("--session-dir", str(BASIC_SESSION), "--out", str(out_path))
            self.assertEqual(result.returncode, 0, result.stderr)
            records = [json.loads(line) for line in out_path.read_text().splitlines()]
            # 2 flow headers + 3 findings (flow 1) + 1 finding (flow 2)
            self.assertEqual(len(records), 6)


class GroupFindingsTests(unittest.TestCase):
    def test_merges_evidence_union_and_notes_all_flows(self):
        findings = [
            {
                "flow_number": 1,
                "signature": "sig-x",
                "level": 2,
                "title": "T",
                "evidence": ["A", "B"],
                "current_behavior": "first",
            },
            {
                "flow_number": 2,
                "signature": "sig-x",
                "level": 2,
                "title": "T",
                "evidence": ["B", "C"],
                "current_behavior": "second",
            },
        ]
        merged = render_report.group_findings(findings)
        self.assertEqual(len(merged), 1)
        group = merged[0]
        self.assertEqual(group["current_behavior"], "first")  # canonical = lowest flow number
        self.assertEqual(group["evidence"][:3], ["A", "B", "C"])  # union, first-seen order
        self.assertEqual(group["evidence"][-1], "Also seen in flows: 1, 2")

    def test_single_occurrence_group_has_no_also_seen_line(self):
        findings = [
            {
                "flow_number": 1,
                "signature": "sig-y",
                "level": 3,
                "title": "T",
                "evidence": ["A"],
                "current_behavior": "only",
            }
        ]
        merged = render_report.group_findings(findings)
        self.assertEqual(merged[0]["evidence"], ["A"])


class RenderReportGoldenTests(unittest.TestCase):
    """Task 7 checklist: golden tests proving the rendered report retains all
    Level 1/2 evidence, suppressed findings, skipped flows, and deferred
    investigations."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.findings_jsonl = Path(self.tmp.name) / "findings.jsonl"
        result = run_parse(
            "--session-dir",
            str(BASIC_SESSION),
            "--out",
            str(self.findings_jsonl),
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def _render(self, *, overrides: Path | None) -> tuple[str, dict]:
        out_path = Path(self.tmp.name) / "report.md"
        args = [
            "--config",
            str(BASIC_SESSION / "config.json"),
            "--findings-jsonl",
            str(self.findings_jsonl),
            "--out",
            str(out_path),
            "--now",
            "2026-07-06T11:30:00Z",
        ]
        if overrides:
            args += ["--overrides", str(overrides)]
        result = run_render(*args)
        self.assertEqual(result.returncode, 0, result.stderr)
        summary = json.loads(result.stdout)
        return out_path.read_text(encoding="utf-8"), summary

    def test_golden_report_with_overrides_matches_byte_for_byte(self):
        report_text, _summary = self._render(overrides=BASIC_SESSION / "overrides.json")
        self.assertEqual(report_text, BASIC_GOLDEN.read_text(encoding="utf-8"))

    def test_golden_report_without_overrides_matches_byte_for_byte(self):
        report_text, _summary = self._render(overrides=None)
        self.assertEqual(report_text, BASIC_NOSUPPRESS_GOLDEN.read_text(encoding="utf-8"))

    def test_retains_all_level_1_evidence(self):
        report_text, _ = self._render(overrides=None)
        self.assertIn(
            "Network: `POST /s/exploratory-testing-2/internal/entity_analytics/"
            "anomalies/anomaly_overview` \u2192 200, same recordId as "
            "exploratory-testing space",
            report_text,
        )
        self.assertIn("Screenshot: `$SESSION_DIR/screenshots/entity-analytics-flow1-leak.png`", report_text)

    def test_retains_all_level_2_evidence_from_every_flow_occurrence(self):
        report_text, _ = self._render(overrides=None)
        self.assertIn(
            "Network: `GET internal/security/entity_store/check_privileges` "
            "\u2192 200 (\u00d73, lines 374/468/474 in request log)",
            report_text,
        )
        self.assertIn(
            "Network: `GET internal/security/entity_store/check_privileges` "
            "\u2192 200 (\u00d73, seen again in flow 2 trace)",
            report_text,
        )
        self.assertIn("Also seen in flows: 1, 2", report_text)

    def test_suppressed_finding_appears_in_known_suppressed_with_reason(self):
        report_text, summary = self._render(overrides=BASIC_SESSION / "overrides.json")
        known_suppressed = report_text[report_text.index("## Known / Suppressed") :]
        self.assertIn("Duplicate privilege-check API calls on single flyout open", known_suppressed)
        self.assertIn("Matches knowledge/entity-analytics.md", known_suppressed)
        self.assertEqual(summary["suppressed_count"], 1)
        self.assertEqual(summary["level2_count"], 0)

    def test_skipped_flow_step_appears_in_skipped_table(self):
        report_text, _ = self._render(overrides=BASIC_SESSION / "overrides.json")
        skipped = report_text[report_text.index("## Skipped") : report_text.index("## Recommended")]
        self.assertIn("2 — Missing prerequisites", skipped)
        self.assertIn("Out of scope for this session", skipped)

    def test_deferred_investigation_appears_in_recommended_follow_up(self):
        report_text, _ = self._render(overrides=None)
        followup = report_text[
            report_text.index("## Recommended Follow-up") : report_text.index("## Known")
        ]
        self.assertIn("Investigate cross-space anomaly leakage further", followup)
        self.assertIn("anomaly APIs leak data across spaces", followup)
        self.assertIn("session cap reached", followup)

    def test_flow_run_over_budget_but_completed_is_not_marked_timed_out(self):
        # Flow 1 ran 12m38s against a 6m budget but attempted every checklist
        # step — it must show "completed" (with the Over? flag set), not
        # "timed out". "Over budget" and "timed out" (steps skipped) are not
        # the same thing; only an explicit --overrides flow_status entry may
        # claim "timed out".
        report_text, _ = self._render(overrides=None)
        timing = report_text[report_text.index("## Timing & Cost") : report_text.index("## Summary")]
        self.assertIn("| Overview panel — Behavioral anomalies accordion | specified | "
                       "2026-07-06T09:05:00Z | 12m 38s | 6m | \u26a0\ufe0f over | completed |", timing)

    def test_not_started_flow_defaults_without_override(self):
        report_text, _ = self._render(overrides=None)
        timing = report_text[report_text.index("## Timing & Cost") : report_text.index("## Summary")]
        self.assertIn("not started", timing)

    def test_blocked_override_is_applied(self):
        report_text, _ = self._render(overrides=BASIC_SESSION / "overrides.json")
        timing = report_text[report_text.index("## Timing & Cost") : report_text.index("## Summary")]
        self.assertIn("blocked", timing)

    def test_suppressing_level_1_finding_is_a_hard_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad_overrides = Path(tmp) / "overrides.json"
            bad_overrides.write_text(
                json.dumps(
                    {
                        "suppressions": [
                            {
                                "title": "anomaly_overview and anomaly_summary leak ML "
                                "anomaly data across Kibana spaces",
                                "reason": "should never be accepted",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            result = run_render(
                "--config",
                str(BASIC_SESSION / "config.json"),
                "--findings-jsonl",
                str(self.findings_jsonl),
                "--out",
                str(Path(tmp) / "report.md"),
                "--overrides",
                str(bad_overrides),
                "--now",
                "2026-07-06T11:30:00Z",
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("never suppressed", result.stderr)

    def test_unknown_suppression_title_is_a_hard_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad_overrides = Path(tmp) / "overrides.json"
            bad_overrides.write_text(
                json.dumps({"suppressions": [{"title": "Does not exist", "reason": "x"}]}),
                encoding="utf-8",
            )
            result = run_render(
                "--config",
                str(BASIC_SESSION / "config.json"),
                "--findings-jsonl",
                str(self.findings_jsonl),
                "--out",
                str(Path(tmp) / "report.md"),
                "--overrides",
                str(bad_overrides),
                "--now",
                "2026-07-06T11:30:00Z",
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("unknown finding title", result.stderr)


class PhaseThreeReportContractTests(unittest.TestCase):
    def test_step_3a_invokes_the_new_scripts(self):
        report = (PHASES_DIR / "3-report.md").read_text(encoding="utf-8")
        step_3a = report[report.index("## Step 3a") : report.index("## Step 3b")]
        self.assertIn("parse-findings.py", step_3a)
        self.assertIn("render-report.py", step_3a)

    def test_step_3b_still_pins_suppression_judgment_language(self):
        # Existing contract tests already pin most of Step 3b's judgment
        # prose (test_report_suppression_scoped_to_known_non_bugs_section_only);
        # this just re-confirms it survived the Task 7 edit and that the new
        # mechanical --overrides step was added alongside it, not instead
        # of it.
        report = (PHASES_DIR / "3-report.md").read_text(encoding="utf-8")
        step_3b = report[report.index("## Step 3b") : report.index("## Step 3c")]
        self.assertIn(
            "Suppression matching reads only the `## Known non-bugs` "
            "section of each file",
            step_3b,
        )
        self.assertIn("render-report.py", step_3b)
        self.assertIn("--overrides", step_3b)

    def test_step_3a_documents_structured_signature_replacing_first_100_chars(self):
        report = (PHASES_DIR / "3-report.md").read_text(encoding="utf-8")
        step_3a = report[report.index("## Step 3a") : report.index("## Step 3b")]
        # The old key is only mentioned as historical context for *why* the
        # new signature exists, not as the active dedup mechanism.
        self.assertIn("structured signature", step_3a)
        self.assertIn("not by `type` + the first 100 characters", step_3a)

    def test_finding_format_documents_optional_status_override_marker(self):
        finding_format = (TEMPLATE_DIR / "finding-format.md").read_text(encoding="utf-8")
        self.assertIn("status-override", finding_format.replace(" ", "-").lower())


if __name__ == "__main__":
    unittest.main()
