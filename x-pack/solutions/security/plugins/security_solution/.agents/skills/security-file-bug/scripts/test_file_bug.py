#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_bug import (  # noqa: E402
    CreateFailed,
    IssueMatch,
    compress_video,
    decide_write_path,
    finding_from_jsonl,
    format_issue_title,
    infer_deployment,
    infer_team_label,
    pack_gaps,
    parse_search_results,
    render_bug_body,
    upload_evidence,
    validate_labels,
    write_github,
)

FIXTURE = Path(__file__).resolve().parent / "__tests__" / "fixtures" / "domain_snippet.md"


class DecideWritePathTest(unittest.TestCase):
    def test_no_matches_creates(self):
        path = decide_write_path([])
        self.assertEqual(path.action, "create")
        self.assertIsNone(path.number)

    def test_one_open_comments(self):
        m = IssueMatch(123, "open", "Risk table empty")
        path = decide_write_path([m])
        self.assertEqual(path.action, "comment")
        self.assertEqual(path.number, 123)

    def test_one_closed_reopens_and_comments(self):
        m = IssueMatch(456, "closed", "Risk table empty")
        path = decide_write_path([m])
        self.assertEqual(path.action, "reopen_comment")
        self.assertEqual(path.number, 456)

    def test_two_matches_asks(self):
        path = decide_write_path(
            [
                IssueMatch(1, "open", "A"),
                IssueMatch(2, "closed", "B"),
            ]
        )
        self.assertEqual(path.action, "ask")
        self.assertIsNone(path.number)
        self.assertEqual(len(path.candidates), 2)


class ValidateLabelsTest(unittest.TestCase):
    catalog = {"bug", "Team:Entity Analytics", "regression"}

    def test_keeps_exact_matches(self):
        decision = validate_labels(["bug", "Team:Entity Analytics"], self.catalog)
        self.assertEqual(decision.keep, ("bug", "Team:Entity Analytics"))
        self.assertEqual(decision.dropped, ())
        self.assertFalse(decision.ask_team)

    def test_drops_unknown_and_asks_if_team_missing(self):
        decision = validate_labels(["bug", "Team:Not A Team"], self.catalog)
        self.assertEqual(decision.keep, ("bug",))
        self.assertEqual(decision.dropped[0][0], "Team:Not A Team")
        self.assertTrue(decision.ask_team)

    def test_unknown_non_team_does_not_ask_team(self):
        decision = validate_labels(["bug", "nope"], self.catalog)
        self.assertEqual(decision.keep, ("bug",))
        self.assertFalse(decision.ask_team)


class InferTeamLabelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.md = FIXTURE.read_text(encoding="utf-8")

    def test_area_entity_analytics_is_confident(self):
        result = infer_team_label(
            area="Entity Analytics", area_slug=None, route=None, knowledge_md=self.md
        )
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Team:Entity Analytics")

    def test_slug_entity_analytics_is_confident(self):
        result = infer_team_label(
            area=None, area_slug="entity-analytics", route=None, knowledge_md=self.md
        )
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Team:Entity Analytics")

    def test_known_route_is_confident(self):
        result = infer_team_label(
            area=None,
            area_slug=None,
            route="Security > Entity Analytics",
            knowledge_md=self.md,
        )
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Team:Entity Analytics")

    def test_unknown_area_asks(self):
        result = infer_team_label(
            area="Onboarding", area_slug="onboarding", route=None, knowledge_md=self.md
        )
        self.assertEqual(result.status, "ask")
        self.assertIsNone(result.label)

    def test_near_miss_area_asks_with_partial_candidates(self):
        result = infer_team_label(
            area="Analytics", area_slug=None, route=None, knowledge_md=self.md
        )
        self.assertEqual(result.status, "ask")
        self.assertIsNone(result.label)
        self.assertIn("Team:Entity Analytics", result.candidates)


FIXTURES = Path(__file__).resolve().parent / "__tests__" / "fixtures"


class RenderBugBodyTest(unittest.TestCase):
    def test_uses_skill_headings_and_finding_fields(self):
        finding = json.loads((FIXTURES / "finding.json").read_text())
        config = json.loads((FIXTURES / "session-config.json").read_text())
        body = render_bug_body(finding, config)
        self.assertIn("**Version:**", body)
        self.assertIn("9.3.0", body)
        self.assertIn("**Current behaviour (with screenshots and recordings):**", body)
        self.assertIn("**Logs and/or server output (if relevant):**", body)
        self.assertIn("**Any additional information:**", body)
        self.assertIn("Open Entity Analytics", body)
        self.assertIn("Table shows 0 entities", body)
        self.assertIn("Table lists entities in range", body)
        self.assertIn("TypeError: cannot read map of undefined", body)
        self.assertIn("t2_analyst", body)
        self.assertIn("**Role required to reproduce:**", body)
        self.assertIn("/tmp/session/screenshots/ea-flow1.png", body)
        self.assertNotIn("**Deployment:**", body)
        self.assertNotIn("**Spaces:**", body)
        self.assertIn("**Browser and Browser OS versions:**", body)
        self.assertIn("Chrome / macos", body)
        self.assertNotIn("**Kibana version:**", body)
        self.assertNotIn("**Kibana/Elasticsearch Stack version:**", body)
        self.assertNotIn("**Functional Area", body)
        self.assertNotIn("**Screenshots (if relevant):**", body)
        self.assertNotIn("**Any additional context", body)
        self.assertNotIn("**Server OS version:**", body)
        self.assertNotIn("**Elastic Endpoint version:**", body)
        self.assertNotIn("**Feature flags:**", body)
        self.assertNotIn("**Preconditions:**", body)
        self.assertNotIn("**Describe the bug:**\n\n**Version", body)
        self.assertNotIn("_unknown_", body)

    def test_optional_environment_headings_only_when_needed(self):
        finding = {
            "current_behavior": "broken",
            "expected_behavior": "works",
            "steps_followed": ["click"],
        }
        config = {
            "environment": {
                "kind": "local",
                "server_os": "Ubuntu 22.04",
                "endpoint_version": "8.16.0",
            }
        }
        body = render_bug_body(finding, config)
        self.assertIn("**Server OS version:**", body)
        self.assertIn("Ubuntu 22.04", body)
        self.assertIn("**Elastic Endpoint version:**", body)
        self.assertIn("8.16.0", body)
        self.assertNotIn("**Browser and Browser OS versions:**", body)
        self.assertNotIn("**Feature flags:**", body)
        self.assertNotIn("**Any additional information:**", body)
        self.assertNotIn("**Role required to reproduce:**", body)
        self.assertNotIn("**Deployment:**", body)
        self.assertNotIn("**Spaces:**", body)

    def test_feature_flags_heading_only_when_named(self):
        finding = {
            "current_behavior": "broken",
            "expected_behavior": "works",
            "steps_followed": ["click"],
        }
        config = {
            "feature_flags": {
                "securitySolution:entityStoreDisabled": True,
            }
        }
        body = render_bug_body(finding, config)
        self.assertIn("**Feature flags:**", body)
        self.assertIn("securitySolution:entityStoreDisabled: on", body)

    def test_always_ask_fields_render_when_present(self):
        finding = {
            "current_behavior": "broken",
            "expected_behavior": "works",
            "steps_followed": ["click"],
            "role": "t2_analyst",
            "deployment": "both",
            "spaces": ["default", "custom"],
            "feature_flags": {"securitySolution:foo": True},
            "feature_flag_setup": "Enable in Advanced Settings",
        }
        body = render_bug_body(finding, {})
        self.assertIn("**Deployment:**", body)
        self.assertIn("ECH and serverless", body)
        self.assertIn("**Role required to reproduce:**", body)
        self.assertIn("t2_analyst", body)
        self.assertIn("**Spaces:**", body)
        self.assertIn("default, custom", body)
        self.assertIn("Setup: Enable in Advanced Settings", body)

    def test_preconditions_heading_only_when_needed(self):
        finding = {
            "current_behavior": "broken",
            "expected_behavior": "works",
            "steps_followed": ["click"],
            "preconditions": ["Fleet enrolled", "Sample logs installed"],
        }
        body = render_bug_body(finding, {})
        self.assertIn("**Preconditions:**", body)
        self.assertIn("Fleet enrolled", body)
        empty = render_bug_body(
            {
                "current_behavior": "broken",
                "expected_behavior": "works",
                "steps_followed": ["click"],
            },
            {},
        )
        self.assertNotIn("**Preconditions:**", empty)

    def test_omits_empty_console_logs_and_never_writes_placeholder(self):
        body = render_bug_body(
            {
                "current_behavior": "broken",
                "expected_behavior": "works",
                "steps_followed": ["click"],
            },
            {},
        )
        self.assertNotIn("_unknown_", body)
        self.assertNotIn("**Errors in browser console (if relevant):**", body)
        self.assertNotIn("**Logs and/or server output (if relevant):**", body)
        self.assertNotIn("**Version:**", body)
        self.assertIn("**Current behaviour (with screenshots and recordings):**", body)

    def test_unknown_answer_keeps_heading(self):
        body = render_bug_body(
            {
                "current_behavior": "broken",
                "expected_behavior": "works",
                "steps_followed": ["click"],
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
                "feature_flags": "Unknown",
            },
            {"kibana_version": "Unknown"},
        )
        self.assertIn("**Deployment:**\nUnknown", body)
        self.assertIn("**Role required to reproduce:**\nUnknown", body)
        self.assertIn("**Spaces:**\nUnknown", body)
        self.assertIn("**Feature flags:**\nUnknown", body)
        self.assertIn("**Version:**\nUnknown", body)
        self.assertNotIn("_unknown_", body)


class FormatIssueTitleTest(unittest.TestCase):
    def test_strips_team_prefix(self):
        self.assertEqual(
            format_issue_title("Team:Entity Analytics", "Risk table empty"),
            "[Entity Analytics] Risk table empty",
        )

    def test_collapses_whitespace(self):
        self.assertEqual(
            format_issue_title("Entity Analytics", "  risk   table  "),
            "[Entity Analytics] risk table",
        )


class ParseSearchResultsTest(unittest.TestCase):
    def test_parses_gh_array(self):
        matches = parse_search_results(
            [{"number": 1, "state": "open", "title": "A"}]
        )
        self.assertEqual(matches[0].number, 1)
        self.assertEqual(matches[0].state, "open")

    def test_parses_items_wrapper(self):
        matches = parse_search_results({"items": [{"number": 9, "state": "closed"}]})
        self.assertEqual(matches[0].number, 9)
        self.assertEqual(matches[0].state, "closed")


class FindingFromJsonlTest(unittest.TestCase):
    records = [
        {"kind": "flow_header", "flow_name": "Happy path"},
        {"kind": "finding", "title": "First", "current_behavior": "a"},
        {"kind": "finding", "title": "Second", "current_behavior": "b"},
    ]

    def test_picks_by_title(self):
        finding = finding_from_jsonl(self.records, title="Second")
        self.assertEqual(finding["current_behavior"], "b")

    def test_picks_by_index(self):
        finding = finding_from_jsonl(self.records, index=0)
        self.assertEqual(finding["title"], "First")

    def test_missing_title_raises(self):
        with self.assertRaises(ValueError):
            finding_from_jsonl(self.records, title="Nope")


class InferDeploymentTest(unittest.TestCase):
    def test_explicit_both(self):
        result = infer_deployment({"deployment": "both"}, {})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "ECH and serverless")

    def test_arch_serverless(self):
        result = infer_deployment({}, {"environment": {"arch": "serverless"}})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Serverless")

    def test_arch_stateful_is_ech(self):
        result = infer_deployment({}, {"environment": {"arch": "stateful"}})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "ECH")

    def test_url_cloud_asks_with_hint(self):
        result = infer_deployment(
            {}, {"environment": {"url": "https://foo.elastic-cloud.com"}}
        )
        self.assertEqual(result.status, "ask")
        self.assertIn("cloud", result.hint or "")

    def test_kind_only_asks(self):
        result = infer_deployment({}, {"environment": {"kind": "scout"}})
        self.assertEqual(result.status, "ask")
        self.assertIsNone(result.label)


class PackGapsTest(unittest.TestCase):
    def test_fixture_is_thin_without_always_ask(self):
        finding = json.loads((FIXTURES / "finding.json").read_text())
        config = json.loads((FIXTURES / "session-config.json").read_text())
        gaps = pack_gaps(finding, config)
        self.assertIn("feature_flags", gaps)
        self.assertIn("deployment", gaps)
        self.assertIn("spaces", gaps)
        self.assertNotIn("version", gaps)
        self.assertNotIn("steps", gaps)
        self.assertNotIn("role", gaps)

    def test_unknown_is_not_a_gap(self):
        gaps = pack_gaps(
            {
                "current_behavior": "broken",
                "expected_behavior": "works",
                "steps_followed": ["click"],
                "feature_flags": "Unknown",
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
            },
            {"kibana_version": "9.3.0"},
        )
        self.assertEqual(gaps, [])


class UploadEvidenceTest(unittest.TestCase):
    def test_png_uploads_first_try(self):
        posts = []

        def http_post(url, headers, file_path):
            posts.append(url)
            return {"ok": True, "status": 201, "url": "https://img/a.png"}

        with TemporaryDirectory() as tmp:
            png = Path(tmp) / "shot.png"
            png.write_bytes(b"png")
            result = upload_evidence(
                issue_number=99,
                repo="elastic/kibana",
                files=[png],
                token="t",
                http_post=http_post,
                compress_video_fn=lambda *a, **k: None,
            )
        self.assertEqual(len(result.uploaded), 1)
        self.assertEqual(result.leftovers, ())
        self.assertIn("/issues/99/assets?name=shot.png", posts[0])

    def test_video_rejected_then_compress_retry_succeeds(self):
        calls = {"n": 0}

        def http_post(url, headers, file_path):
            calls["n"] += 1
            if calls["n"] == 1:
                return {"ok": False, "status": 413, "url": None}
            return {"ok": True, "status": 201, "url": "https://img/v.mp4"}

        compressed = {"done": False}

        def compress(src, dest, run=None):
            compressed["done"] = True
            dest.write_bytes(b"small")

        with TemporaryDirectory() as tmp:
            video = Path(tmp) / "flow.mp4"
            video.write_bytes(b"huge")
            result = upload_evidence(
                issue_number=99,
                repo="elastic/kibana",
                files=[video],
                token="t",
                http_post=http_post,
                compress_video_fn=compress,
            )
        self.assertTrue(compressed["done"])
        self.assertEqual(len(result.uploaded), 1)
        self.assertEqual(result.leftovers, ())

    def test_video_still_failing_is_leftover_not_raised(self):
        def http_post(url, headers, file_path):
            return {"ok": False, "status": 413, "url": None}

        with TemporaryDirectory() as tmp:
            video = Path(tmp) / "flow.mp4"
            video.write_bytes(b"huge")
            result = upload_evidence(
                issue_number=99,
                repo="elastic/kibana",
                files=[video],
                token="t",
                http_post=http_post,
                compress_video_fn=lambda src, dest, run=None: dest.write_bytes(b"x"),
            )
        self.assertEqual(result.uploaded, ())
        self.assertEqual(len(result.leftovers), 1)

    def test_compress_video_invokes_ffmpeg(self):
        seen = []

        def run(argv, **kwargs):
            seen.append(argv)
            class R:
                returncode = 0
            return R()

        with TemporaryDirectory() as tmp:
            src = Path(tmp) / "in.mp4"
            dest = Path(tmp) / "out.mp4"
            src.write_bytes(b"x")
            compress_video(src, dest, run)
        self.assertEqual(seen[0][0], "ffmpeg")
        self.assertIn("-fs", seen[0])
        self.assertIn("9M", seen[0])


class WriteGithubTest(unittest.TestCase):
    def test_create_failure_is_not_retried(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {"returncode": 1, "stdout": "", "stderr": "nope"}

        with self.assertRaises(CreateFailed):
            write_github(
                action="create",
                repo="elastic/kibana",
                title="Bug",
                body="body",
                labels=["bug"],
                number=None,
                run_gh=run_gh,
            )
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][0:3], ["gh", "issue", "create"])

    def test_comment_retries_once(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            if len(calls) == 1:
                return {"returncode": 1, "stdout": "", "stderr": "tmp"}
            return {
                "returncode": 0,
                "stdout": "https://github.com/elastic/kibana/issues/1#issuecomment-2",
                "stderr": "",
            }

        result = write_github(
            action="comment",
            repo="elastic/kibana",
            title=None,
            body="evidence",
            labels=[],
            number=1,
            run_gh=run_gh,
        )
        self.assertEqual(len(calls), 2)
        self.assertIn("issues/1", result["url"])

    def test_reopen_then_comment(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {
                "returncode": 0,
                "stdout": "https://github.com/elastic/kibana/issues/9",
                "stderr": "",
            }

        write_github(
            action="reopen_comment",
            repo="elastic/kibana",
            title=None,
            body="evidence",
            labels=[],
            number=9,
            run_gh=run_gh,
        )
        self.assertEqual(calls[0][0:4], ["gh", "issue", "reopen", "9"])
        self.assertEqual(calls[1][0:4], ["gh", "issue", "comment", "9"])

    def test_ask_does_not_write(self):
        def run_gh(argv):
            raise AssertionError("must not write")

        with self.assertRaises(ValueError):
            write_github(
                action="ask",
                repo="elastic/kibana",
                title=None,
                body="x",
                labels=[],
                number=None,
                run_gh=run_gh,
            )


CLI = Path(__file__).resolve().parent / "file-bug.py"


def run_cli(*argv, stdin=None):
    return subprocess.run(
        [sys.executable, str(CLI), *argv],
        input=stdin,
        capture_output=True,
        text=True,
        check=False,
    )


class FileBugCliTest(unittest.TestCase):
    def test_decide_no_matches_json(self):
        result = subprocess.run(
            [sys.executable, str(CLI), "decide", "--matches", "-"],
            input='{"matches":[]}',
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["action"], "create")

    def test_decide_two_matches_exits_2_with_candidates(self):
        result = run_cli(
            "decide",
            "--matches",
            "-",
            stdin=json.dumps(
                {
                    "matches": [
                        {"number": 1, "state": "open", "title": "A"},
                        {"number": 2, "state": "closed", "title": "B"},
                    ]
                }
            ),
        )
        self.assertEqual(result.returncode, 2)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["action"], "ask")
        self.assertEqual(len(payload["candidates"]), 2)

    def test_render_body_prints_template_headings(self):
        result = run_cli(
            "render-body",
            "--finding",
            str(FIXTURES / "finding.json"),
            "--config",
            str(FIXTURES / "session-config.json"),
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("**Steps to reproduce:**", json.loads(result.stdout)["body"])

    def test_format_title_cli(self):
        result = run_cli(
            "format-title",
            "--label",
            "Team:Entity Analytics",
            "--symptom",
            "Risk table empty",
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(
            json.loads(result.stdout)["title"],
            "[Entity Analytics] Risk table empty",
        )

    def test_parse_search_cli(self):
        result = run_cli(
            "parse-search",
            "--input",
            "-",
            stdin=json.dumps([{"number": 12, "state": "open", "title": "A"}]),
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["matches"][0]["number"], 12)

    def test_infer_deployment_cli_asks(self):
        result = run_cli(
            "infer-deployment",
            "--config",
            str(FIXTURES / "session-config.json"),
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)["status"], "ask")

    def test_from_findings_cli(self):
        jsonl = "\n".join(
            [
                json.dumps({"kind": "flow_header", "flow_name": "A"}),
                json.dumps({"kind": "finding", "title": "Named", "current_behavior": "x"}),
            ]
        )
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings.jsonl"
            path.write_text(jsonl, encoding="utf-8")
            result = run_cli("from-findings", "--jsonl", str(path), "--title", "Named")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["finding"]["title"], "Named")

    def test_check_pack_cli_exits_2_when_thin(self):
        result = run_cli(
            "check-pack",
            "--finding",
            str(FIXTURES / "finding.json"),
            "--config",
            str(FIXTURES / "session-config.json"),
        )
        self.assertEqual(result.returncode, 2)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["thin"])
        self.assertIn("deployment", payload["gaps"])


SKILL = Path(__file__).resolve().parents[1] / "SKILL.md"


class SkillProtocolTest(unittest.TestCase):
    def setUp(self):
        self.text = SKILL.read_text(encoding="utf-8")

    def test_frontmatter(self):
        self.assertIn("name: security-file-bug", self.text)
        self.assertIn("disable-model-invocation: true", self.text)

    def test_human_gate(self):
        self.assertIn("create a bug", self.text.lower())
        self.assertIn("do not offer to file anything on your own initiative", self.text.lower())
        self.assertNotIn("shall I file these", self.text)
        self.assertNotIn("does not load during exploratory testing", self.text)

    def test_confirm_before_write(self):
        self.assertIn("explicit yes", self.text.lower())
        self.assertIn("file-bug.py", self.text)
        self.assertIn("prepare a draft", self.text.lower())

    def test_duplicate_table(self):
        self.assertIn("reopen_comment", self.text)
        self.assertIn("elastic/kibana", self.text)

    def test_quality_rules(self):
        self.assertIn("templates/bug-report.md", self.text)
        self.assertIn("Feature flags:", self.text)
        self.assertIn("exact flag id", self.text.lower())
        self.assertIn("recording", self.text.lower())
        self.assertIn("snapshots", self.text.lower())
        self.assertIn("Always ask if missing", self.text)
        self.assertIn("serverless", self.text.lower())
        self.assertIn("specific role", self.text.lower())
        self.assertIn("default space", self.text.lower())
        self.assertIn("Preconditions:", self.text)
        self.assertIn("Environment setup questions", self.text)
        self.assertIn("exact error message", self.text.lower())

    def test_two_collect_paths(self):
        self.assertIn("Two collect paths", self.text)
        self.assertIn("Path A — from scratch", self.text)
        self.assertIn("Path B — exploratory-tester pack", self.text)
        self.assertIn("two full loops", self.text.lower())
        self.assertIn("[<team name>]", self.text)
        self.assertIn("Unknown", self.text)
        self.assertIn("Do not assume every session is local Scout", self.text)
        self.assertIn("thin", self.text.lower())
        self.assertIn("not already on that issue", self.text)
        self.assertIn("parse-findings.py", self.text)
        self.assertIn("from-findings", self.text)
        self.assertIn("parse-search", self.text)
        self.assertIn("format-title", self.text)
        self.assertIn("infer-deployment", self.text)
        self.assertIn("check-pack", self.text)
        self.assertIn("two issues", self.text)
        self.assertNotIn("usually two issues", self.text)
        self.assertIn("URL that contains `cloud`", self.text)
        self.assertIn("stateful", self.text)
        self.assertIn("Never write `_unknown_`", self.text)


if __name__ == "__main__":
    unittest.main()
