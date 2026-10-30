#!/usr/bin/env python3
import json
import os
import shutil
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
    FILED_MARKER,
    FILED_VIA,
    KIBANA_REPO,
    SECURITY_TEAM_REPO,
    IssueMatch,
    PartialWrite,
    TESTER_SOURCE_LABEL,
    TitleTooLong,
    _default_http_post,
    _install_method,
    check_draft,
    compress_video,
    decide_write_path,
    embed_uploads,
    finding_from_jsonl,
    format_issue_title,
    infer_deployment,
    infer_release_label,
    infer_team_label,
    pack_gaps,
    parse_search_results,
    render_bug_body,
    has_media,
    scan_security_hints,
    scan_sensitive,
    search_queries,
    run_search,
    scan_wip,
    upload_evidence,
    validate_labels,
    with_filed_stamp,
    write_github,
)

FIXTURE = Path(__file__).resolve().parent / "__tests__" / "fixtures" / "domain_snippet.md"


class DecideWritePathTest(unittest.TestCase):
    def test_no_matches_creates(self):
        path = decide_write_path([])
        self.assertEqual(path.action, "create")
        self.assertIsNone(path.number)

    def test_one_open_asks(self):
        m = IssueMatch(123, "open", "Risk table empty")
        path = decide_write_path([m])
        self.assertEqual(path.action, "ask")
        self.assertIsNone(path.number)
        self.assertEqual(path.candidates, (m,))

    def test_one_closed_asks(self):
        m = IssueMatch(456, "closed", "Risk table empty")
        path = decide_write_path([m])
        self.assertEqual(path.action, "ask")
        self.assertIsNone(path.number)
        self.assertEqual(path.candidates, (m,))

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

    def test_application_route_is_confident(self):
        result = infer_team_label(
            area=None,
            area_slug=None,
            route="/app/security/alerts",
            knowledge_md=self.md,
        )
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Team:Detection Engineering")

    def test_security_solution_alias_is_real_label(self):
        result = infer_team_label(
            area="Security Solution",
            area_slug=None,
            route=None,
            knowledge_md=self.md,
        )
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Team: SecuritySolution")

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
SKILL_ROOT = Path(__file__).resolve().parents[1]


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
        self.assertIn("Flow: Happy path", body)
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
        self.assertIn(FILED_VIA, body)

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

    def test_video_and_backticked_session_paths_in_current(self):
        body = render_bug_body(
            {
                "title": "Leak across spaces",
                "why_issue": "Tenant isolation",
                "current_behavior": "Same record in empty space",
                "expected_behavior": "Zero anomalies",
                "steps_followed": ["open flyout"],
                "evidence": [
                    "Screenshot: `$SESSION_DIR/screenshots/leak.png`",
                    "Video: `$SESSION_DIR/videos/flow.mp4`",
                ],
            },
            {"session_dir": "/tmp/session"},
        )
        current = body.split("**Current behaviour (with screenshots and recordings):**", 1)[1]
        additional = current.split("**Any additional information:**", 1)[0] if "**Any additional information:**" in current else current
        self.assertIn("/tmp/session/screenshots/leak.png", additional)
        self.assertIn("/tmp/session/videos/flow.mp4", additional)
        self.assertNotIn("`$SESSION_DIR", additional)
        describe = body.split("**Describe the bug:**", 1)[1].split("\n\n**", 1)[0]
        self.assertIn("Leak across spaces", describe)
        self.assertIn("Tenant isolation", describe)
        self.assertNotIn("Same record in empty space", describe)

    def test_drops_non_path_media_status(self):
        body = render_bug_body(
            {
                "title": "Leak across spaces",
                "current_behavior": "Same record in empty space",
                "expected_behavior": "Zero anomalies",
                "steps_followed": ["open flyout"],
                "evidence": [
                    "Screenshot: `$SESSION_DIR/screenshots/leak.png`",
                    "Video: unavailable (ffmpeg missing)",
                ],
            },
            {"session_dir": "/tmp/session"},
        )
        current = body.split("**Current behaviour (with screenshots and recordings):**", 1)[1]
        self.assertIn("/tmp/session/screenshots/leak.png", current)
        self.assertNotIn("unavailable", current)
        self.assertNotIn("ffmpeg", current)

    def test_tester_config_fills_deployment_space_role_install(self):
        config = {
            "environment": {
                "type": "serverless",
                "url": "https://example.kb.region.elastic.cloud",
                "space_id": "exploratory-testing",
            },
            "setup": {"resolved_role": "exploratory_platform_engineer"},
        }
        finding = {
            "current_behavior": "Table shows 0 entities",
            "expected_behavior": "Table lists entities",
            "steps_followed": ["open"],
        }
        gaps = pack_gaps(finding, config)
        self.assertNotIn("deployment", gaps)
        self.assertNotIn("spaces", gaps)
        self.assertNotIn("role", gaps)
        self.assertIn("version", gaps)
        self.assertIn("feature_flags", gaps)
        body = render_bug_body(finding, config)
        self.assertIn("**Deployment:**\nServerless", body)
        self.assertIn("custom (exploratory-testing)", body)
        self.assertIn("exploratory_platform_engineer", body)
        self.assertIn("Elastic Cloud", body)


class FormatIssueTitleTest(unittest.TestCase):
    def test_strips_team_prefix(self):
        self.assertEqual(
            format_issue_title("Team:Entity Analytics", "Risk table empty"),
            "[Entity Analytics] [Bug] Risk table empty",
        )

    def test_collapses_whitespace(self):
        self.assertEqual(
            format_issue_title("Entity Analytics", "  risk   table  "),
            "[Entity Analytics] [Bug] risk table",
        )

    def test_strips_trailing_period(self):
        self.assertEqual(
            format_issue_title("Entity Analytics", "Risk table empty."),
            "[Entity Analytics] [Bug] Risk table empty",
        )

    def test_rejects_vague_symptom(self):
        with self.assertRaises(ValueError):
            format_issue_title("Entity Analytics", "broken")

    def test_rejects_too_long(self):
        with self.assertRaises(TitleTooLong) as raised:
            format_issue_title("Entity Analytics", "x" * 130)
        self.assertIn("≤140", str(raised.exception))
        self.assertNotIn("…", str(raised.exception))


class ParseSearchResultsTest(unittest.TestCase):
    def test_parses_gh_array(self):
        matches = parse_search_results(
            [{"number": 1, "state": "open", "title": "A", "body": "Same table stays empty"}]
        )
        self.assertEqual(matches[0].number, 1)
        self.assertEqual(matches[0].state, "open")
        self.assertEqual(matches[0].body, "Same table stays empty")

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
        self.assertEqual(finding["source"], "exploratory-tester")

    def test_picks_by_index(self):
        finding = finding_from_jsonl(self.records, index=1)
        self.assertEqual(finding["title"], "First")
        self.assertEqual(finding_from_jsonl(self.records, index=2)["title"], "Second")

    def test_index_zero_is_out_of_range(self):
        with self.assertRaises(ValueError):
            finding_from_jsonl(self.records, index=0)

    def test_missing_title_raises(self):
        with self.assertRaises(ValueError):
            finding_from_jsonl(self.records, title="Nope")

    def test_title_skips_observations(self):
        records = [
            {
                "kind": "finding",
                "block_type": "Observation",
                "title": "Looks fine",
                "current_behavior": "ok",
            },
            {
                "kind": "finding",
                "block_type": "Finding",
                "title": "Looks fine",
                "current_behavior": "bug",
            },
        ]
        finding = finding_from_jsonl(records, title="Looks fine")
        self.assertEqual(finding["current_behavior"], "bug")
        self.assertEqual(finding["block_type"], "Finding")

    def test_title_of_observation_only_raises(self):
        records = [
            {
                "kind": "finding",
                "block_type": "Observation",
                "title": "Happy path renders",
                "current_behavior": "ok",
            }
        ]
        with self.assertRaises(ValueError):
            finding_from_jsonl(records, title="Happy path renders")


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

    def test_tester_type_serverless(self):
        result = infer_deployment({}, {"environment": {"type": "serverless"}})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "Serverless")

    def test_tester_type_stateful_ess(self):
        result = infer_deployment({}, {"environment": {"type": "stateful-ess"}})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "ECH")


class InstallMethodTest(unittest.TestCase):
    def test_local_scout_serverless_is_from_source(self):
        self.assertEqual(
            _install_method({"kind": "scout", "type": "serverless"}),
            "from source (dev)",
        )
        self.assertEqual(
            _install_method({"kind": "scout", "arch": "serverless"}),
            "from source (dev)",
        )

    def test_scout_ech_is_elastic_cloud(self):
        self.assertEqual(
            _install_method({"kind": "scout", "type": "stateful-ess"}),
            "Elastic Cloud",
        )

    def test_scout_cloud_url_is_elastic_cloud(self):
        self.assertEqual(
            _install_method(
                {
                    "kind": "scout",
                    "type": "serverless",
                    "url": "https://foo.kb.region.elastic.cloud",
                }
            ),
            "Elastic Cloud",
        )

    def test_local_scout_is_from_source(self):
        self.assertEqual(_install_method({"kind": "scout"}), "from source (dev)")

    def test_serverless_without_kind_or_url_is_omitted(self):
        self.assertIsNone(_install_method({"type": "serverless"}))


class InferReleaseLabelTest(unittest.TestCase):
    def test_stack_version_to_v_label(self):
        result = infer_release_label({}, {"kibana_version": "9.6.0"})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "v9.6.0")

    def test_strips_leading_v_and_trailing_notes(self):
        result = infer_release_label(
            {}, {"kibana_version": "v9.6.0 (serverless PR of #293848)"}
        )
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "v9.6.0")

    def test_minor_only_pads_patch(self):
        result = infer_release_label({}, {"kibana_version": "9.6"})
        self.assertEqual(result.status, "confident")
        self.assertEqual(result.label, "v9.6.0")

    def test_unknown_asks(self):
        result = infer_release_label({}, {"kibana_version": "Unknown"})
        self.assertEqual(result.status, "ask")
        self.assertIsNone(result.label)

    def test_pr_build_asks(self):
        result = infer_release_label({}, {"kibana_version": "main"})
        self.assertEqual(result.status, "ask")
        self.assertIn("not a stack release", result.hint or "")


class PackGapsTest(unittest.TestCase):
    def test_fixture_is_thin_without_always_ask(self):
        finding = json.loads((FIXTURES / "finding.json").read_text())
        config = json.loads((FIXTURES / "session-config.json").read_text())
        gaps = pack_gaps(finding, config)
        self.assertIn("feature_flags", gaps)
        self.assertIn("deployment", gaps)
        self.assertIn("spaces", gaps)
        self.assertNotIn("version", gaps)
        self.assertNotIn("release", gaps)
        self.assertNotIn("steps", gaps)
        self.assertNotIn("role", gaps)

    def test_unknown_version_is_not_a_release_gap(self):
        gaps = pack_gaps(
            {
                "version": "Unknown",
                "current_behavior": "Table shows 0 entities",
                "expected_behavior": "Table lists entities",
                "steps_followed": ["click"],
                "feature_flags": "Unknown",
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
            },
            {},
        )
        self.assertNotIn("version", gaps)
        self.assertNotIn("release", gaps)

    def test_unknown_is_not_a_gap(self):
        gaps = pack_gaps(
            {
                "current_behavior": "Table shows 0 entities",
                "expected_behavior": "Table lists entities",
                "steps_followed": ["click"],
                "feature_flags": "Unknown",
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
            },
            {"kibana_version": "9.3.0"},
        )
        self.assertEqual(gaps, [])

    def test_vague_current_and_unquoted_error(self):
        gaps = pack_gaps(
            {
                "current_behavior": "an error appears",
                "expected_behavior": "works",
                "steps_followed": ["click"],
                "feature_flags": "Unknown",
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
            },
            {"kibana_version": "9.3.0"},
        )
        self.assertIn("current_vague", gaps)
        self.assertIn("expected_vague", gaps)
        self.assertIn("error_unquoted", gaps)

    def test_finding_version_clears_version_gap(self):
        gaps = pack_gaps(
            {
                "version": "9.6.0",
                "current_behavior": "Table shows 0 entities",
                "expected_behavior": "Table lists entities",
                "steps_followed": ["click"],
                "feature_flags": "Unknown",
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
            },
            {},
        )
        self.assertNotIn("version", gaps)
        self.assertNotIn("release", gaps)


class ScanSensitiveTest(unittest.TestCase):
    def test_flags_email_and_case(self):
        hits = scan_sensitive("Ping ada@elastic.co about SDH12345 and our customer")
        self.assertIn("email", hits)
        self.assertIn("support_case", hits)
        self.assertIn("customer_or_nda", hits)

    def test_clean_text_is_empty(self):
        self.assertEqual(scan_sensitive("Table shows 0 entities"), [])


class SecurityRoutingTest(unittest.TestCase):
    def test_flags_security_signals(self):
        for text in (
            "See CVE-2024-12345",
            "Authorization: Basic ZWxhc3RpYzpzM2NyZXRQYXNz",
            "curl -u elastic:MyRealPassword https://x",
            "curl --user elastic:MyRealPassword https://x",
            "https://admin:hunter2pass@cluster.example.com",
            "Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123",
            "api_key=sk_live_abcdef123456",
            "-----BEGIN RSA PRIVATE KEY-----",
        ):
            self.assertIn("security_issue", scan_sensitive(text), text)

    def test_credential_lookalikes_do_not_gate(self):
        for text in (
            "Basic configuration is required",
            "Token: undefined",
            "Password: required",
            "api_key=$BASE64_API_KEY",
            "https://elastic:changeme@localhost:9200",
            "curl -u elastic:changeme http://localhost:5601",
            "curl -u elastic:password http://localhost:5601",
            "Token: expired_or_invalid_value",
            "Secret: configuration-not-found",
            "token=verification-pending",
            "curl -u elastic:$ES_PASS https://x",
            "https://user:${PASS}@host",
            "curl -u elastic:**** https://x",
            "https://user:***@cluster.example.com",
            "https://example.com/app/security",
        ):
            self.assertNotIn("security_issue", scan_sensitive(text), text)

    def test_plain_ui_bug_is_not_security(self):
        self.assertNotIn("security_issue", scan_sensitive("Table shows 0 entities"))

    def _finding(self):
        return {
            "title": "Risk table empty",
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["click"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }

    def _body(self, extra):
        return render_bug_body(self._finding(), {"kibana_version": "9.3.0"}) + extra

    def _gaps(self, **kwargs):
        return check_draft(
            body=self._body("\nSee CVE-2024-12345.\n"),
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=self._finding(),
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
            **kwargs,
        )

    def test_check_draft_blocks_kibana_repo(self):
        self.assertIn("security_issue:file_in_security_team", self._gaps())

    def test_check_draft_allows_security_team_repo(self):
        self.assertNotIn(
            "security_issue:file_in_security_team",
            self._gaps(repo=SECURITY_TEAM_REPO),
        )

    def test_sensitive_ok_does_not_unlock_kibana_repo(self):
        self.assertIn(
            "security_issue:file_in_security_team", self._gaps(sensitive_ok=True)
        )

    def test_security_ok_unlocks_kibana_repo(self):
        self.assertNotIn(
            "security_issue:file_in_security_team", self._gaps(security_ok=True)
        )

    def _write(self, repo, **kwargs):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {
                "returncode": 0,
                "stdout": f"https://github.com/{repo}/issues/1",
                "stderr": "",
            }

        write_github(
            action="create",
            repo=repo,
            title="Bug",
            body="See CVE-2024-12345",
            labels=["bug"],
            number=None,
            run_gh=run_gh,
            **kwargs,
        )
        return calls

    def test_write_refuses_kibana_repo(self):
        with self.assertRaises(ValueError):
            self._write(KIBANA_REPO)

    def test_write_allows_security_team_and_security_ok(self):
        self.assertTrue(self._write(SECURITY_TEAM_REPO))
        self.assertTrue(self._write(KIBANA_REPO, security_ok=True))


class MediaGateTest(unittest.TestCase):
    def test_has_media(self):
        self.assertTrue(has_media("![shot](https://x/y.png)"))
        self.assertTrue(has_media("Recording: /tmp/flow.mp4"))
        self.assertFalse(has_media("Table shows 0 entities"))

    def test_check_draft_requires_media_review(self):
        finding = {
            "title": "Risk table empty",
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["click"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        body = render_bug_body(finding, {"kibana_version": "9.3.0"}) + "\n![s](a.png)\n"
        kwargs = dict(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("media_review", check_draft(**kwargs))
        self.assertNotIn("media_review", check_draft(**kwargs, media_ok=True))


class ScanWipTest(unittest.TestCase):
    def test_flags_draft_pr_note(self):
        hits = scan_wip(
            "PR #293848 is still a draft, so this may be known work in progress."
        )
        self.assertEqual(hits, ["wip_or_limitation"])

    def test_flags_known_limitation(self):
        self.assertEqual(
            scan_wip("This is a known limitation of the old table."),
            ["wip_or_limitation"],
        )

    def test_clean_repro_is_empty(self):
        self.assertEqual(scan_wip("Group by is lost after a hard reload."), [])


class CheckDraftTest(unittest.TestCase):
    def test_complete_draft_is_fileable(self):
        finding = {
            "title": "Risk table empty",
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "No feature flag (default/GA)",
            "deployment": "ECH",
            "role": "none",
            "spaces": "default",
        }
        body = render_bug_body(finding, {"kibana_version": "9.3.0"})
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertEqual(gaps, [])

    def test_comment_body_does_not_require_template_or_stamp(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        gaps = check_draft(
            body=(
                "Same defect as this issue. Missing repro: after Last 1 year "
                'the toast is `TypeError: cannot read map`.\n'
            ),
            title=None,
            finding=finding,
            config={"kibana_version": "9.3.0"},
        )
        self.assertEqual(gaps, [])
        self.assertNotIn("stamp", gaps)
        self.assertNotIn("body_describe", gaps)

    def test_comment_without_finding_skips_template_gaps_but_keeps_safety_gates(self):
        clean = check_draft(
            body="Still reproducible on 9.3.0: 0 results for Last 24 hours.\n",
            title=None,
            finding={},
            config={},
        )
        self.assertEqual(clean, [])
        flagged = check_draft(
            body="Ping ada@elastic.co, CVE-2024-12345, ![s](a.png)\n",
            title=None,
            finding={},
            config={},
        )
        self.assertIn("sensitive:email", flagged)
        self.assertIn("security_issue:file_in_security_team", flagged)
        self.assertIn("media_review", flagged)

    def test_missing_stamp_and_bad_title(self):
        gaps = check_draft(
            body="**Steps to reproduce:**\n1. click\n",
            title="broken",
            finding={
                "current_behavior": "Table shows 0",
                "expected_behavior": "Table lists entities",
                "steps_followed": ["click"],
                "feature_flags": "Unknown",
                "deployment": "Unknown",
                "role": "Unknown",
                "spaces": "Unknown",
            },
            config={"kibana_version": "9.3.0"},
        )
        self.assertIn("stamp", gaps)
        self.assertIn("title", gaps)

    def test_tester_create_requires_source_label(self):
        finding = {
            "source": "exploratory-tester",
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "No feature flag (default/GA)",
            "deployment": "ECH",
            "role": "none",
            "spaces": "default",
        }
        body = render_bug_body(finding, {"kibana_version": "9.3.0"})
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed", "Team:Entity Analytics"],
        )
        self.assertIn("tester_label", gaps)
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed", "Team:Entity Analytics", TESTER_SOURCE_LABEL],
        )
        self.assertNotIn("tester_label", gaps)

    def test_draft_pr_note_is_wip_until_cleared(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "No feature flag (default/GA)",
            "deployment": "ECH",
            "role": "none",
            "spaces": "default",
        }
        body = render_bug_body(finding, {"kibana_version": "9.3.0"})
        body += "\nPR #293848 is still a draft.\n"
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("wip_or_limitation", gaps)
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
            wip_ok=True,
        )
        self.assertNotIn("wip_or_limitation", gaps)

    def test_cases_ui_text_clears_with_sensitive_ok(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        body = render_bug_body(finding, {"kibana_version": "9.3.0"})
        body += "\nOpening case 12345 from the Cases table.\n"
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("sensitive:case_id", gaps)
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
            sensitive_ok=True,
        )
        self.assertNotIn("sensitive:case_id", gaps)

    def test_filled_markdown_does_not_need_mirrored_json(self):
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.6.0\n\n"
            "**Feature flags:**\nNo feature flag (default/GA)\n\n"
            "**Deployment:**\nECH\n\n"
            "**Role required to reproduce:**\nnone\n\n"
            "**Spaces:**\ndefault\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nTable lists entities\n\n"
            f"{FILED_VIA}\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding={},
            config={},
            labels=["bug", "triage_needed"],
        )
        self.assertEqual(gaps, [])

    def test_markdown_edit_clears_stale_json_pack_gaps(self):
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.6.0\n\n"
            "**Feature flags:**\nNo feature flag (default/GA)\n\n"
            "**Deployment:**\nECH\n\n"
            "**Role required to reproduce:**\nnone\n\n"
            "**Spaces:**\ndefault\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nTable lists entities\n\n"
            f"{FILED_VIA}\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding={
                "current_behavior": "an error appears",
                "expected_behavior": "works",
                "steps_followed": [],
            },
            config={},
            labels=["bug", "triage_needed"],
        )
        self.assertEqual(gaps, [])

    def test_empty_expected_plus_stamp_is_a_gap(self):
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.6.0\n\n"
            "**Feature flags:**\nNo feature flag (default/GA)\n\n"
            "**Deployment:**\nECH\n\n"
            "**Role required to reproduce:**\nnone\n\n"
            "**Spaces:**\ndefault\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\n\n"
            f"{FILED_VIA}\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding={},
            config={},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("body_expected", gaps)
        self.assertIn("expected", gaps)

    def test_vague_expected_plus_stamp_is_still_vague(self):
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.6.0\n\n"
            "**Feature flags:**\nNo feature flag (default/GA)\n\n"
            "**Deployment:**\nECH\n\n"
            "**Role required to reproduce:**\nnone\n\n"
            "**Spaces:**\ndefault\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nworks\n\n"
            f"{FILED_VIA}\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding={},
            config={},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("expected_vague", gaps)

    def test_inline_bold_note_stays_in_steps(self):
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.6.0\n\n"
            "**Feature flags:**\nNo feature flag (default/GA)\n\n"
            "**Deployment:**\nECH\n\n"
            "**Role required to reproduce:**\nnone\n\n"
            "**Spaces:**\ndefault\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n"
            "**Note:** needs Fleet first\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nTable lists entities\n\n"
            f"{FILED_VIA}\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding={},
            config={},
            labels=["bug", "triage_needed"],
        )
        self.assertEqual(gaps, [])

    def test_complete_json_empty_body_is_not_fileable(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "No feature flag (default/GA)",
            "deployment": "ECH",
            "role": "none",
            "spaces": "default",
        }
        gaps = check_draft(
            body=FILED_VIA,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("body_describe", gaps)
        self.assertIn("body_version", gaps)
        self.assertIn("body_steps", gaps)
        self.assertIn("body_current", gaps)
        self.assertIn("body_expected", gaps)

    def test_stamp_in_html_comment_is_not_visible(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        body = (
            f"<!-- Stamp: {FILED_VIA} -->\n"
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.3.0\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nTable lists entities\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("stamp", gaps)

    def test_with_filed_stamp_appends_when_only_in_comment(self):
        body = f"<!-- {FILED_VIA} -->\n**Describe the bug:**\nRisk table empty\n"
        updated = with_filed_stamp(body)
        self.assertTrue(updated.rstrip().endswith(FILED_MARKER))
        visible = updated.split("-->", 1)[-1]
        self.assertIn(FILED_VIA, visible)

    def test_with_filed_stamp_adds_hidden_marker_once(self):
        updated = with_filed_stamp("**Describe the bug:**\nRisk table empty\n")
        self.assertEqual(updated.count(FILED_MARKER), 1)
        self.assertEqual(updated.count(FILED_VIA), 1)
        self.assertEqual(with_filed_stamp(updated), updated)


class MarkerMetaTest(unittest.TestCase):
    def test_marker_carries_agent_model_and_run(self):
        updated = with_filed_stamp(
            "Body\n", {"agent": "codex", "model": "gpt-5", "run": "abc123"}
        )
        self.assertIn("<!-- filed-via: file-bug v1 agent=codex model=gpt-5 run=abc123 -->", updated)
        self.assertEqual(updated.count("filed-via: file-bug"), 1)

    def test_enriched_marker_replaces_the_plain_one(self):
        plain = with_filed_stamp("Body\n")
        self.assertIn(FILED_MARKER, plain)
        updated = with_filed_stamp(plain, {"agent": "cursor"})
        self.assertNotIn(FILED_MARKER, updated)
        self.assertEqual(updated.count("filed-via: file-bug"), 1)
        self.assertEqual(updated.count(FILED_VIA), 1)

    def test_unsafe_marker_values_are_dropped(self):
        updated = with_filed_stamp("Body\n", {"agent": "a --> <b>", "model": "ok-1"})
        self.assertNotIn("agent=", updated)
        self.assertIn("model=ok-1", updated)
        self.assertEqual(updated.count("-->"), 1)

    def test_write_cli_accepts_agent_and_model(self):
        result = run_cli("write", "--help")
        self.assertIn("--agent", result.stdout)
        self.assertIn("--model", result.stdout)


class PathADraftTest(unittest.TestCase):
    def test_unfilled_template_is_not_fileable(self):
        template = (SKILL_ROOT / "templates" / "bug-report.md").read_text(
            encoding="utf-8"
        )
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        gaps = check_draft(
            body=template,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertIn("stamp", gaps)
        self.assertIn("body_describe", gaps)
        self.assertIn("body_version", gaps)
        self.assertIn("body_steps", gaps)
        self.assertIn("body_current", gaps)
        self.assertIn("body_expected", gaps)

    def test_filled_path_a_markdown_is_fileable(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["Open Entity Analytics"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.3.0\n\n"
            "**Feature flags:**\nUnknown\n\n"
            "**Deployment:**\nUnknown\n\n"
            "**Role required to reproduce:**\nUnknown\n\n"
            "**Spaces:**\nUnknown\n\n"
            "**Steps to reproduce:**\n1. Open Entity Analytics\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nTable lists entities\n\n"
            f"{FILED_VIA}\n"
        )
        gaps = check_draft(
            body=body,
            title="[Entity Analytics] [Bug] Risk table empty",
            finding=finding,
            config={"kibana_version": "9.3.0"},
            labels=["bug", "triage_needed"],
        )
        self.assertEqual(gaps, [])


class EmbedUploadsTest(unittest.TestCase):
    def test_wraps_image_paths_as_markdown(self):
        body = "See /tmp/session/screenshots/leak.png"
        updated = embed_uploads(
            body, [("/tmp/session/screenshots/leak.png", "https://img/leak.png")]
        )
        self.assertEqual(updated, "See ![leak.png](https://img/leak.png)")

    def test_unwraps_backticked_image_path(self):
        body = "See `/tmp/shot.png`"
        updated = embed_uploads(body, [("/tmp/shot.png", "https://img/shot.png")])
        self.assertEqual(updated, "See ![shot.png](https://img/shot.png)")

    def test_keeps_existing_image_alt_text(self):
        body = "![Before reload](/tmp/shot.png)"
        updated = embed_uploads(body, [("/tmp/shot.png", "https://img/shot.png")])
        self.assertEqual(updated, "![Before reload](https://img/shot.png)")

    def test_wraps_video_as_player_on_own_paragraph(self):
        body = "Recording: /tmp/flow.mp4"
        updated = embed_uploads(body, [("/tmp/flow.mp4", "https://img/flow.mp4")])
        self.assertEqual(
            updated,
            "Recording:\n\n<video src=\"https://img/flow.mp4\" controls></video>\n\n",
        )

    def test_replaces_markdown_image_video_with_player(self):
        body = "![](/tmp/flow.mp4)"
        updated = embed_uploads(body, [("/tmp/flow.mp4", "https://img/flow.mp4")])
        self.assertEqual(
            updated, '\n\n<video src="https://img/flow.mp4" controls></video>\n\n'
        )

    def test_mixed_image_and_video(self):
        body = "/tmp/shot.png\n/tmp/flow.mp4"
        updated = embed_uploads(
            body,
            [
                ("/tmp/shot.png", "https://img/shot.png"),
                ("/tmp/flow.mp4", "https://img/flow.mp4"),
            ],
        )
        self.assertEqual(
            updated,
            "![shot.png](https://img/shot.png)\n\n"
            '<video src="https://img/flow.mp4" controls></video>\n\n',
        )


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
                repo="elastic/kibana",
                files=[png],
                token="t",
                repository_id=7833168,
                http_post=http_post,
                compress_video_fn=lambda *a, **k: None,
            )
        self.assertEqual(len(result.uploaded), 1)
        self.assertEqual(result.leftovers, ())
        self.assertIn("user-attachments/assets", posts[0])
        self.assertIn("repository_id=7833168", posts[0])

    def test_encodes_spaces_in_filename(self):
        posts = []

        def http_post(url, headers, file_path):
            posts.append(url)
            return {"ok": True, "status": 201, "url": "https://img/a.png"}

        with TemporaryDirectory() as tmp:
            png = Path(tmp) / "risk score table.png"
            png.write_bytes(b"png")
            upload_evidence(
                repo="elastic/kibana",
                files=[png],
                token="t",
                repository_id=7833168,
                http_post=http_post,
                compress_video_fn=lambda *a, **k: None,
            )
        self.assertIn("name=risk%20score%20table.png", posts[0])
        self.assertNotIn("name=risk score table.png", posts[0])

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
                repo="elastic/kibana",
                files=[video],
                token="t",
                repository_id=1,
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
                repo="elastic/kibana",
                files=[video],
                token="t",
                repository_id=1,
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
        ffmpeg = next(argv for argv in seen if argv and argv[0] == "ffmpeg")
        self.assertNotIn("-fs", ffmpeg)
        self.assertIn("-b:v", ffmpeg)
        self.assertIn("libx264", ffmpeg)

    def test_compress_video_webm_uses_webm_codecs(self):
        seen = []

        def run(argv, **kwargs):
            seen.append(argv)
            class R:
                returncode = 0
            return R()

        with TemporaryDirectory() as tmp:
            src = Path(tmp) / "in.webm"
            dest = Path(tmp) / "out.webm"
            src.write_bytes(b"x")
            compress_video(src, dest, run)
        ffmpeg = next(argv for argv in seen if argv and argv[0] == "ffmpeg")
        self.assertIn("libvpx-vp9", ffmpeg)
        self.assertIn("libopus", ffmpeg)
        self.assertNotIn("libx264", ffmpeg)
        self.assertNotIn("aac", ffmpeg)

    def test_oversized_webm_retry_uploads_mp4(self):
        posts = []

        def http_post(url, headers, file_path):
            posts.append((url, headers.get("Content-Type"), file_path.suffix))
            if file_path.suffix.lower() == ".webm":
                return {"ok": False, "status": 413, "url": None}
            return {"ok": True, "status": 201, "url": "https://img/v.mp4"}

        dests = []

        def compress(src, dest, run=None):
            dests.append(dest)
            dest.write_bytes(b"small")

        with TemporaryDirectory() as tmp:
            video = Path(tmp) / "flow.webm"
            video.write_bytes(b"huge")
            result = upload_evidence(
                repo="elastic/kibana",
                files=[video],
                token="t",
                repository_id=1,
                http_post=http_post,
                compress_video_fn=compress,
            )
        self.assertEqual(dests[0].suffix, ".mp4")
        self.assertEqual(posts[1][1], "video/mp4")
        self.assertIn("content_type=video%2Fmp4", posts[1][0])
        self.assertIn("name=flow.mp4", posts[1][0])
        self.assertEqual(len(result.uploaded), 1)
        self.assertEqual(result.leftovers, ())

    def test_http_post_passes_headers_on_stdin(self):
        seen = {}

        def run(argv, **kwargs):
            seen["argv"] = argv
            seen["input"] = kwargs.get("input")
            class R:
                returncode = 0
                stdout = '{"url":"https://img/a"}\n201'
                stderr = ""
            return R()

        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "shot.png"
            path.write_bytes(b"png")
            result = _default_http_post(
                "https://uploads.github.com/x",
                {"Authorization": "Bearer secret-token", "Accept": "application/json"},
                path,
                run=run,
            )
        self.assertIn("-K", seen["argv"])
        self.assertIn("-", seen["argv"])
        self.assertNotIn("Bearer secret-token", " ".join(seen["argv"]))
        self.assertIn("Bearer secret-token", seen["input"])
        self.assertTrue(result["ok"])


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
        self.assertIn("--type", calls[0])
        self.assertIn("Bug", calls[0])

    def test_create_adds_tester_label_from_finding(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {
                "returncode": 0,
                "stdout": "https://github.com/elastic/kibana/issues/1",
                "stderr": "",
            }

        result = write_github(
            action="create",
            repo="elastic/kibana",
            title="Bug",
            body="body",
            labels=["bug"],
            number=None,
            finding={"source": "exploratory-tester"},
            run_gh=run_gh,
        )
        self.assertIn(TESTER_SOURCE_LABEL, result["labels"])
        self.assertIn("bug", result["labels"])
        self.assertIn("triage_needed", result["labels"])
        self.assertIn("--label", calls[0])
        self.assertIn(TESTER_SOURCE_LABEL, calls[0])
        self.assertIn("--type", calls[0])
        self.assertIn("Bug", calls[0])

    def test_create_does_not_infer_release_label(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {
                "returncode": 0,
                "stdout": "https://github.com/elastic/kibana/issues/1",
                "stderr": "",
            }

        result = write_github(
            action="create",
            repo="elastic/kibana",
            title="[Entity Analytics] [Bug] Risk table empty",
            body="body",
            labels=["Team:Entity Analytics"],
            number=None,
            config={"kibana_version": "9.6.0"},
            run_gh=run_gh,
        )
        self.assertEqual(
            result["labels"],
            ["bug", "triage_needed", "Team:Entity Analytics"],
        )
        self.assertFalse(any(argv[1:3] == ["label", "list"] for argv in calls))
        create = next(argv for argv in calls if argv[1:3] == ["issue", "create"])
        self.assertNotIn("v9.6.0", create)

    def test_create_keeps_release_label_passed_by_caller(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {
                "returncode": 0,
                "stdout": "https://github.com/elastic/kibana/issues/1",
                "stderr": "",
            }

        result = write_github(
            action="create",
            repo="elastic/kibana",
            title="[Entity Analytics] [Bug] Risk table empty",
            body="body",
            labels=["Team:Entity Analytics", "v9.6.0"],
            number=None,
            config={"kibana_version": "8.15.0"},
            run_gh=run_gh,
        )
        self.assertEqual(
            result["labels"],
            ["bug", "triage_needed", "Team:Entity Analytics", "v9.6.0"],
        )
        create = next(argv for argv in calls if argv[1:3] == ["issue", "create"])
        self.assertIn("v9.6.0", create)
        self.assertNotIn("v8.15.0", create)

    def test_comment_adds_tester_label_to_existing_issue(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {
                "returncode": 0,
                "stdout": "https://github.com/elastic/kibana/issues/1",
                "stderr": "",
            }

        write_github(
            action="comment",
            repo="elastic/kibana",
            title=None,
            body="evidence",
            labels=[],
            number=1,
            finding={"source": "exploratory-tester"},
            run_gh=run_gh,
        )
        self.assertEqual(calls[0][0:4], ["gh", "issue", "comment", "1"])
        self.assertEqual(calls[1][0:4], ["gh", "issue", "edit", "1"])
        self.assertIn("--add-label", calls[1])
        self.assertIn(TESTER_SOURCE_LABEL, calls[1])

    def test_comment_url_kept_when_tester_label_fails(self):
        comment_url = "https://github.com/elastic/kibana/issues/1#issuecomment-9"

        def run_gh(argv):
            if argv[1:3] == ["issue", "comment"]:
                return {"returncode": 0, "stdout": comment_url, "stderr": ""}
            if argv[1:3] == ["issue", "edit"]:
                return {"returncode": 1, "stdout": "", "stderr": "label missing"}
            return {"returncode": 0, "stdout": "", "stderr": ""}

        with self.assertRaises(PartialWrite) as raised:
            write_github(
                action="comment",
                repo="elastic/kibana",
                title=None,
                body="evidence",
                labels=[],
                number=1,
                finding={"source": "exploratory-tester"},
                run_gh=run_gh,
            )
        self.assertEqual(raised.exception.number, 1)
        self.assertEqual(raised.exception.url, comment_url)
        self.assertIn(comment_url, str(raised.exception))

    def test_comment_failure_is_not_retried(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            return {"returncode": 1, "stdout": "", "stderr": "tmp"}

        with self.assertRaises(RuntimeError):
            write_github(
                action="comment",
                repo="elastic/kibana",
                title=None,
                body="evidence",
                labels=[],
                number=1,
                run_gh=run_gh,
            )
        self.assertEqual(len(calls), 1)

    def test_reopen_without_comment_is_partial_write(self):
        calls = []

        def run_gh(argv):
            calls.append(argv)
            if argv[2] == "reopen":
                return {"returncode": 0, "stdout": "", "stderr": ""}
            return {"returncode": 1, "stdout": "", "stderr": "comment failed"}

        with self.assertRaises(PartialWrite) as raised:
            write_github(
                action="reopen_comment",
                repo="elastic/kibana",
                title=None,
                body="evidence",
                labels=[],
                number=9,
                run_gh=run_gh,
            )
        self.assertEqual(raised.exception.number, 9)
        self.assertEqual(calls[0][0:4], ["gh", "issue", "reopen", "9"])

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
            "[Entity Analytics] [Bug] Risk table empty",
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

    def test_infer_release_cli(self):
        with TemporaryDirectory() as tmp:
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({"kibana_version": "9.6.0"}), encoding="utf-8")
            result = run_cli("infer-release", "--config", str(config))
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["label"], "v9.6.0")

    def test_from_findings_cli(self):
        jsonl = "\n".join(
            [
                json.dumps({"kind": "flow_header", "flow_name": "A"}),
                json.dumps({"kind": "finding", "title": "Named", "current_behavior": "x"}),
            ]
        )
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "findings.jsonl"
            out = Path(tmp) / "finding.json"
            path.write_text(jsonl, encoding="utf-8")
            result = run_cli(
                "from-findings",
                "--jsonl",
                str(path),
                "--title",
                "Named",
                "--out",
                str(out),
            )
            payload = json.loads(result.stdout)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(payload["title"], "Named")
            self.assertEqual(payload["source"], "exploratory-tester")
            self.assertNotIn("finding", payload)
            self.assertEqual(json.loads(out.read_text(encoding="utf-8"))["title"], "Named")

    def test_render_body_writes_out(self):
        with TemporaryDirectory() as tmp:
            out = Path(tmp) / "body.md"
            result = run_cli(
                "render-body",
                "--finding",
                str(FIXTURES / "finding.json"),
                "--config",
                str(FIXTURES / "session-config.json"),
                "--out",
                str(out),
            )
            self.assertEqual(result.returncode, 0)
            self.assertIn("**Steps to reproduce:**", out.read_text(encoding="utf-8"))
            self.assertIn("**Steps to reproduce:**", json.loads(result.stdout)["body"])

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

    def test_scan_sensitive_cli_asks(self):
        result = run_cli("scan-sensitive", "--text", "email me at ada@elastic.co")
        self.assertEqual(result.returncode, 2)
        self.assertIn("email", json.loads(result.stdout)["hits"])

    def test_scan_wip_cli_asks(self):
        result = run_cli("scan-wip", "--text", "PR #12 is still a draft")
        self.assertEqual(result.returncode, 2)
        self.assertIn("wip_or_limitation", json.loads(result.stdout)["hits"])

    def test_check_draft_cli_help_explains_gaps(self):
        with TemporaryDirectory() as tmp:
            body_path = Path(tmp) / "body.md"
            body_path.write_text("PR #12 is still a draft\n", encoding="utf-8")
            result = run_cli(
                "check-draft", "--action", "comment", "--body", str(body_path)
            )
        out = json.loads(result.stdout)
        self.assertIn("wip_or_limitation", out["help"])
        self.assertIn("--wip-ok", out["help"]["wip_or_limitation"])

    def test_check_draft_cli_exits_2_without_stamp(self):
        finding = {
            "current_behavior": "Table shows 0",
            "expected_behavior": "Table lists entities",
            "steps_followed": ["click"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        with TemporaryDirectory() as tmp:
            finding_path = Path(tmp) / "finding.json"
            body_path = Path(tmp) / "body.md"
            finding_path.write_text(json.dumps(finding), encoding="utf-8")
            body_path.write_text("**Version:**\n9.3.0\n", encoding="utf-8")
            result = run_cli(
                "check-draft",
                "--finding",
                str(finding_path),
                "--body",
                str(body_path),
                "--title",
                "[Entity Analytics] [Bug] Risk table empty",
            )
        self.assertEqual(result.returncode, 2)
        self.assertIn("stamp", json.loads(result.stdout)["gaps"])

    def test_check_draft_cli_accepts_repeated_label(self):
        finding = {
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["click"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        body = (
            "**Describe the bug:**\nRisk table empty\n\n"
            "**Version:**\n9.3.0\n\n"
            "**Feature flags:**\nUnknown\n\n"
            "**Deployment:**\nUnknown\n\n"
            "**Role required to reproduce:**\nUnknown\n\n"
            "**Spaces:**\nUnknown\n\n"
            "**Steps to reproduce:**\n1. click\n\n"
            "**Current behaviour (with screenshots and recordings):**\n"
            'Toast: "TypeError: cannot read map"\n\n'
            "**Expected behavior:**\nTable lists entities\n\n"
            f"{FILED_VIA}\n"
        )
        with TemporaryDirectory() as tmp:
            finding_path = Path(tmp) / "finding.json"
            body_path = Path(tmp) / "body.md"
            finding_path.write_text(json.dumps(finding), encoding="utf-8")
            body_path.write_text(body, encoding="utf-8")
            result = run_cli(
                "check-draft",
                "--finding",
                str(finding_path),
                "--body",
                str(body_path),
                "--title",
                "[Entity Analytics] [Bug] Risk table empty",
                "--label",
                "bug",
                "--label",
                "triage_needed",
            )
        self.assertEqual(result.returncode, 0)

    def test_check_draft_cli_sensitive_ok(self):
        finding = {
            "title": "Risk table empty",
            "current_behavior": 'Toast: "TypeError: cannot read map"',
            "expected_behavior": "Table lists entities",
            "steps_followed": ["click"],
            "feature_flags": "Unknown",
            "deployment": "Unknown",
            "role": "Unknown",
            "spaces": "Unknown",
        }
        with TemporaryDirectory() as tmp:
            finding_path = Path(tmp) / "finding.json"
            body_path = Path(tmp) / "body.md"
            finding_path.write_text(json.dumps(finding), encoding="utf-8")
            body_path.write_text(
                render_bug_body(finding, {"kibana_version": "9.3.0"})
                + "\nOpening case 12345.\n",
                encoding="utf-8",
            )
            blocked = run_cli(
                "check-draft",
                "--finding",
                str(finding_path),
                "--body",
                str(body_path),
                "--title",
                "[Entity Analytics] [Bug] Risk table empty",
                "--label",
                "bug",
                "--label",
                "triage_needed",
            )
            allowed = run_cli(
                "check-draft",
                "--finding",
                str(finding_path),
                "--body",
                str(body_path),
                "--title",
                "[Entity Analytics] [Bug] Risk table empty",
                "--label",
                "bug",
                "--label",
                "triage_needed",
                "--sensitive-ok",
            )
        self.assertEqual(blocked.returncode, 2)
        self.assertIn("sensitive:case_id", json.loads(blocked.stdout)["gaps"])
        self.assertEqual(allowed.returncode, 0)

    def test_file_bug_library_is_not_a_cli(self):
        result = subprocess.run(
            [sys.executable, str(CLI.parent / "file_bug.py")],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("file-bug.py", result.stderr)

    def test_decide_help_describes_create_or_ask(self):
        result = run_cli("decide", "--help")
        self.assertEqual(result.returncode, 0)
        self.assertIn("create if no matches", result.stdout)
        self.assertNotIn("reopen_comment / ask", result.stdout)

    def test_from_findings_help_is_one_based(self):
        result = run_cli("from-findings", "--help")
        self.assertEqual(result.returncode, 0)
        self.assertIn("1-based", result.stdout)

    def test_format_title_cli_rejects_vague(self):
        result = run_cli(
            "format-title",
            "--label",
            "Team:Entity Analytics",
            "--symptom",
            "broken",
        )
        self.assertEqual(result.returncode, 1)

    def test_format_title_cli_asks_when_too_long(self):
        result = run_cli(
            "format-title",
            "--label",
            "Team:Entity Analytics",
            "--symptom",
            "x" * 130,
        )
        self.assertEqual(result.returncode, 2)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "ask")
        self.assertIn("≤140", payload["error"])

    def test_embed_uploads_cli_writes_out_file(self):
        with TemporaryDirectory() as tmp:
            body = Path(tmp) / "body.md"
            dest = Path(tmp) / "embedded.md"
            mapping = Path(tmp) / "uploaded.json"
            body.write_text("See /tmp/shot.png\n", encoding="utf-8")
            mapping.write_text(
                json.dumps(
                    {"uploaded": [{"path": "/tmp/shot.png", "url": "https://img/shot.png"}]}
                ),
                encoding="utf-8",
            )
            result = run_cli(
                "embed-uploads",
                "--body",
                str(body),
                "--map",
                str(mapping),
                "--out",
                str(dest),
            )
            self.assertEqual(result.returncode, 0)
            embedded = dest.read_text(encoding="utf-8")
            self.assertEqual(embedded, "See ![shot.png](https://img/shot.png)\n")
            self.assertEqual(
                json.loads(result.stdout)["body"], "See ![shot.png](https://img/shot.png)\n"
            )

    def test_embed_uploads_cli_rejects_malformed_map(self):
        with TemporaryDirectory() as tmp:
            body = Path(tmp) / "body.md"
            mapping = Path(tmp) / "uploaded.json"
            body.write_text("See /tmp/shot.png\n", encoding="utf-8")
            mapping.write_text(
                json.dumps([["/tmp/shot.png", "https://img/shot.png"]]),
                encoding="utf-8",
            )
            result = run_cli("embed-uploads", "--body", str(body), "--map", str(mapping))
            self.assertEqual(result.returncode, 1)
            self.assertIn("path", result.stderr)


TESTER_PARSE = (
    Path(__file__).resolve().parents[2]
    / "exploratory-tester"
    / "scripts"
    / "parse-findings.py"
)
TESTER_SESSION = (
    Path(__file__).resolve().parents[2]
    / "exploratory-tester"
    / "scripts"
    / "__tests__"
    / "fixtures"
    / "report-session-basic"
)
KNOWLEDGE = (
    Path(__file__).resolve().parents[3]
    / "references"
    / "security-domain-knowledge.md"
)


class TesterPackIntegrationTest(unittest.TestCase):
    def test_real_findings_jsonl_and_setup_config(self):
        with TemporaryDirectory() as tmp:
            out = Path(tmp) / "findings.jsonl"
            parsed = subprocess.run(
                [
                    sys.executable,
                    str(TESTER_PARSE),
                    "--findings",
                    str(TESTER_SESSION / "findings-flow-1.md"),
                    str(TESTER_SESSION / "findings-flow-2.md"),
                    "--out",
                    str(out),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(parsed.returncode, 0, parsed.stderr)
            records = [
                json.loads(line)
                for line in out.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
        finding = finding_from_jsonl(records, index=1)
        self.assertNotEqual(finding.get("block_type"), "Observation")
        config = {
            "area": "Entity Analytics",
            "area_slug": "entity-analytics",
            "session_dir": "/tmp/session",
            "environment": {
                "type": "serverless",
                "url": "https://example.kb.region.elastic.cloud",
                "space_id": "exploratory-testing",
            },
            "setup": {"resolved_role": "exploratory_platform_engineer"},
        }
        self.assertEqual(infer_deployment(finding, config).label, "Serverless")
        gaps = pack_gaps(finding, config)
        self.assertNotIn("deployment", gaps)
        self.assertNotIn("spaces", gaps)
        team = infer_team_label(
            area=config["area"],
            area_slug=config["area_slug"],
            route=None,
            knowledge_md=KNOWLEDGE.read_text(encoding="utf-8"),
        )
        self.assertEqual(team.status, "confident")
        self.assertEqual(team.label, "Team:Entity Analytics")
        body = render_bug_body(finding, config)
        self.assertIn("/tmp/session/screenshots/", body)
        self.assertNotIn("`$SESSION_DIR", body)
        self.assertIn(f"**Describe the bug:**\n{finding['title']}", body)
        self.assertNotIn(f"**Describe the bug:**\n{finding['current_behavior']}", body)
        self.assertIn("flow_name", finding)
        self.assertNotIn("flow", finding)
        self.assertIn(f"Flow: {finding['flow_name']}", body)


class SearchCommandTest(unittest.TestCase):
    ISSUE = {
        "number": 900001,
        "state": "open",
        "title": "[Bug] `Raw document_parsing_exception` shown for an invalid IP",
        "body": "raw document_parsing_exception from Elasticsearch",
    }

    def _github_like(self, calls):
        """Mimic GitHub: an identifier ANDed with other words and no in: qualifier returns []."""

        def run_gh(argv):
            query = argv[-1]
            calls.append(argv)
            qualified = "in:title" in query or "in:body" in query
            bare = query.strip() == "document_parsing_exception"
            has_token = "document_parsing_exception" in query
            hit = bare or (has_token and qualified) or (not has_token and qualified)
            stdout = json.dumps([self.ISSUE] if hit and argv[2] == "issues" else [])
            return {"returncode": 0, "stdout": stdout, "stderr": ""}

        return run_gh

    def test_query_set_qualifies_every_identifier_plus_words_query(self):
        queries = search_queries("document_parsing_exception", "value list ip", "Manage value lists")
        self.assertEqual(queries[0], "document_parsing_exception")
        for query in queries[1:]:
            if "document_parsing_exception" in query:
                self.assertTrue(query.endswith(("in:title", "in:body")), query)
        self.assertIn("value list ip", queries)
        self.assertIn("document_parsing_exception value list ip in:title", queries)
        self.assertIn("document_parsing_exception value list ip in:body", queries)
        self.assertIn("Manage value lists in:title", queries)

    def test_without_token_only_split_plain_queries_run(self):
        self.assertEqual(
            search_queries(None, "value list invalid ip"),
            [
                "value list invalid ip",
                "value list invalid ip in:title",
                "value list invalid ip in:body",
            ],
        )

    def test_bad_token_and_empty_input_rejected(self):
        for token, words in (("-x", "a"), ("two words", "a"), (None, "")):
            with self.assertRaises(ValueError):
                search_queries(token, words)

    def test_search_finds_duplicate_that_unqualified_and_misses(self):
        calls = []
        matches, ran = run_search(
            repo="elastic/kibana",
            token="document_parsing_exception",
            words="value list ip",
            run_gh=self._github_like(calls),
        )
        self.assertEqual([m.number for m in matches], [900001])
        kinds = {(c[2], c[-1]) for c in calls}
        self.assertIn(("issues", "document_parsing_exception"), kinds)
        self.assertTrue(any(c[2] == "prs" and "--state" in c and "open" in c for c in calls))
        self.assertEqual(len(ran), len(calls))

    def test_gh_failure_is_an_error_not_an_empty_result(self):
        def run_gh(argv):
            return {"returncode": 1, "stdout": "", "stderr": "rate limited"}

        with self.assertRaises(RuntimeError):
            run_search(repo="elastic/kibana", token=None, words="value list", run_gh=run_gh)

    def test_cli_search_asks_on_duplicate_via_gh_override(self):
        with TemporaryDirectory() as tmp:
            stub = Path(tmp) / "gh_stub.py"
            stub.write_text(
                "import json, sys\n"
                "q = sys.argv[-1]\n"
                "hit = q == 'document_parsing_exception' or 'in:' in q\n"
                "print(json.dumps([{'number': 7, 'state': 'open', 'title': 't', 'body': 'b'}] "
                "if hit and sys.argv[2] == 'issues' else []))\n",
                encoding="utf-8",
            )
            env = {**os.environ, "FILE_BUG_GH": f"{sys.executable} {stub}"}
            result = subprocess.run(
                [sys.executable, str(CLI), "search", "--repo", "elastic/kibana",
                 "--token", "document_parsing_exception", "--words", "value list ip"],
                capture_output=True, text=True, check=False, env=env,
            )
        self.assertEqual(result.returncode, 2, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["action"], "ask")
        self.assertEqual(payload["candidates"][0]["number"], 7)
        self.assertTrue(payload["queries"])

    def test_cli_search_create_when_everything_is_empty(self):
        with TemporaryDirectory() as tmp:
            stub = Path(tmp) / "gh_stub.py"
            stub.write_text("print('[]')\n", encoding="utf-8")
            env = {**os.environ, "FILE_BUG_GH": f"{sys.executable} {stub}"}
            result = subprocess.run(
                [sys.executable, str(CLI), "search", "--repo", "elastic/kibana", "--words", "x y"],
                capture_output=True, text=True, check=False, env=env,
            )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["action"], "create")


class WriteLocalPathGuardTest(unittest.TestCase):
    def _write(self, body):
        def run_gh(argv):
            return {"returncode": 0, "stdout": "https://github.com/o/r/issues/1", "stderr": ""}

        return write_github(
            action="create",
            repo="elastic/kibana",
            title="[T] [Bug] x",
            body=body,
            labels=["bug"],
            number=None,
            run_gh=run_gh,
        )

    def test_refuses_body_with_local_media_path(self):
        for body in (
            "Screenshot: /tmp/shot.png",
            "![s](./shot.jpg)",
            "Screenshot: $SESSION_DIR/screenshots/a.png",
            "Recording: ~/flow.mp4",
            "Screenshot: `/tmp/shot.png`",
            "Recording: `flow.mp4`",
            "![s](`./a.png`)",
        ):
            with self.assertRaises(ValueError, msg=body):
                self._write(body)

    def test_allows_repro_snippets_that_look_like_paths(self):
        for body in (
            '<img src="/missing.png" onerror="alert(1)">',
            'Payload: `<video src="missing.mp4" onerror="alert(1)">`',
            'Payload: `![x](./x.png)`',
            'Payload: ``![s](`./a.png`)`` renders',
            '```html\n<video src="missing.mp4" onerror="alert(1)">\n![x](./x.png)\n```',
            "Payload: `<img src=/a/b.png onerror=alert(1)>` renders",
            "```html\n<img src=\"/tmp/x/shot.png\">\n```",
        ):
            self.assertTrue(self._write(body), body)
        with self.assertRaises(ValueError):
            self._write("See /tmp/x/shot.png for the screenshot")

    def test_allows_embedded_urls_and_plain_text(self):
        self.assertTrue(self._write("![s](https://github.com/user-attachments/assets/1)"))
        self.assertTrue(self._write("<video src=\"https://img/flow.mp4\" controls></video>"))
        self.assertTrue(self._write("The table shows 0 results"))


class PrepareCommandTest(unittest.TestCase):
    def test_prepare_runs_the_path_b_pipeline(self):
        with TemporaryDirectory() as tmp:
            session = Path(tmp) / "session"
            shutil.copytree(TESTER_SESSION, session)
            out = Path(tmp) / "out"
            result = run_cli(
                "prepare", "--session-dir", str(session), "--out-dir", str(out), "--index", "1"
            )
            payload = json.loads(result.stdout)
            self.assertIn(result.returncode, (0, 2), result.stderr)
            self.assertTrue((out / "finding.json").exists())
            self.assertTrue((out / "body.md").exists())
            self.assertEqual(
                json.loads((out / "finding.json").read_text())["source"], "exploratory-tester"
            )
            for key in ("pack_gaps", "deployment", "release", "sensitive"):
                self.assertIn(key, payload)

    def test_prepare_fails_cleanly_without_findings(self):
        with TemporaryDirectory() as tmp:
            result = run_cli("prepare", "--session-dir", tmp, "--out-dir", str(Path(tmp) / "o"))
            self.assertNotEqual(result.returncode, 0)


class SecurityGateRegressionTest(unittest.TestCase):
    UI_TEXT = (
        "Findings > Vulnerabilities table is empty",
        "Exploit prevention toggle does not save",
        "Potential RCE via PowerShell (prebuilt rule name)",
        "Token: undefined after refresh",
        "Basic configuration.settings.value is shown",
        "api_key: ****",
    )

    def test_normal_ui_text_never_gates(self):
        for text in self.UI_TEXT:
            self.assertNotIn("security_issue", scan_sensitive(text), text)

    def test_high_precision_patterns_still_gate(self):
        for text in (
            "see CVE-2024-12345",
            "-----BEGIN RSA PRIVATE KEY-----",
            "Authorization: Bearer abcdefghijklmnopqrstuv9",
            "api_key=sk_live_abcdef123456",
            "password: hunter2hunter",
        ):
            self.assertIn("security_issue", scan_sensitive(text), text)

    def test_word_list_terms_are_hints_not_hits(self):
        for text in self.UI_TEXT[:3] + ("a stored XSS in the rule name", "authentication bypass"):
            self.assertEqual(scan_security_hints(text), ["security_hint"], text)
            self.assertNotIn("security_issue", scan_sensitive(text), text)
        self.assertEqual(scan_security_hints("Alerts table shows 0 results"), [])

    def test_title_is_scanned(self):
        gaps = check_draft(
            body="Alerts table is empty\n",
            title="[T] [Bug] leaks key AKIAABCDEFGHIJKLMNOP",
            finding={},
            config={},
            action="comment",
        )
        self.assertIn("security_issue:file_in_security_team", gaps)

    def test_create_without_title_is_a_gap(self):
        gaps = check_draft(body="x\n", title=None, finding={}, config={}, action="create")
        self.assertIn("title", gaps)

    def test_cli_check_draft_needs_title_or_explicit_comment_action(self):
        with TemporaryDirectory() as tmp:
            body = Path(tmp) / "b.md"
            body.write_text("Still reproducible on 9.3.0\n", encoding="utf-8")
            forgotten = run_cli("check-draft", "--body", str(body))
            self.assertEqual(forgotten.returncode, 1)
            comment = run_cli("check-draft", "--body", str(body), "--action", "comment")
            self.assertEqual(comment.returncode, 0, comment.stderr)

    def test_cli_check_draft_reports_hints_without_gapping(self):
        with TemporaryDirectory() as tmp:
            body = Path(tmp) / "b.md"
            body.write_text("Potential RCE via PowerShell is the rule name\n", encoding="utf-8")
            result = run_cli("check-draft", "--body", str(body), "--action", "comment")
            payload = json.loads(result.stdout)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(payload["hints"], ["security_hint"])

    def test_cli_scan_sensitive_hint_only_exits_zero(self):
        result = run_cli("scan-sensitive", "--text", "Exploit prevention toggle does not save")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["hints"], ["security_hint"])


class LocalPathAndMediaRegressionTest(unittest.TestCase):
    def test_relative_paths_are_caught(self):
        for body in ("Screenshot: shot.png", "![s](screenshots/a.png)", '<video src="a.mp4" controls></video>'):
            with self.assertRaises(ValueError, msg=body):
                write_github(
                    action="comment", repo="elastic/kibana", title=None, body=body,
                    labels=[], number=1,
                    run_gh=lambda argv: {"returncode": 0, "stdout": "u", "stderr": ""},
                )

    def test_urls_and_prose_are_not_caught(self):
        for body in (
            "Screenshot: https://github.com/user-attachments/assets/1",
            "![s](https://x/y/a.png)",
            "prose mentioning foo.mov and bar.png",
        ):
            write_github(
                action="comment", repo="elastic/kibana", title=None, body=body,
                labels=[], number=1,
                run_gh=lambda argv: {"returncode": 0, "stdout": "https://github.com/o/r/issues/1", "stderr": ""},
            )

    def test_prose_filenames_do_not_trigger_media_review(self):
        self.assertFalse(has_media("see foo.mov and bar.png in prose"))
        self.assertTrue(has_media("Screenshot: shot.png"))


class RepoAllowListTest(unittest.TestCase):
    def _gh(self, argv):
        return {"returncode": 0, "stdout": "https://github.com/o/r/issues/1", "stderr": ""}

    def test_write_requires_a_known_repo(self):
        for repo in ("", "someone/else", "elastic/kibana-other"):
            with self.assertRaises(ValueError, msg=repo):
                write_github(action="comment", repo=repo, title=None, body="x", labels=[], number=1, run_gh=self._gh)
        write_github(action="comment", repo="elastic/security-team", title=None, body="x", labels=[], number=1, run_gh=self._gh)

    def test_extra_repo_env_allows_a_scratch_repo(self):
        os.environ["FILE_BUG_EXTRA_REPOS"] = "me/scratch"
        try:
            write_github(action="comment", repo="me/scratch", title=None, body="x", labels=[], number=1, run_gh=self._gh)
        finally:
            del os.environ["FILE_BUG_EXTRA_REPOS"]

    def test_upload_requires_a_known_repo(self):
        with self.assertRaises(ValueError):
            upload_evidence(repo="someone/else", files=[], token="t")


class GhOverrideIsReadOnlyTest(unittest.TestCase):
    def test_override_blocks_write_commands(self):
        from file_bug import _default_run_gh

        os.environ["FILE_BUG_GH"] = f"{sys.executable} -c pass"
        try:
            blocked = _default_run_gh(["gh", "issue", "create", "--repo", "elastic/kibana"])
            read = _default_run_gh(["gh", "search", "issues", "x"])
        finally:
            del os.environ["FILE_BUG_GH"]
        self.assertEqual(blocked["returncode"], 1)
        self.assertIn("blocked", blocked["stderr"])
        self.assertEqual(read["returncode"], 0)


SKILL = SKILL_ROOT / "SKILL.md"


class SkillProtocolTest(unittest.TestCase):
    def setUp(self):
        self.skill = SKILL.read_text(encoding="utf-8")
        self.text = "\n".join(
            [
                self.skill,
                (SKILL_ROOT / "references" / "drafting.md").read_text(encoding="utf-8"),
                (SKILL_ROOT / "references" / "path-b.md").read_text(encoding="utf-8"),
                (SKILL_ROOT / "templates" / "bug-report.md").read_text(encoding="utf-8"),
            ]
        )

    def test_frontmatter(self):
        self.assertIn("name: file-bug", self.skill)
        self.assertIn("disable-model-invocation: true", self.skill)
        self.assertIn("Use when the user asks", self.skill)
        self.assertIn("references/drafting.md", self.skill)

    def test_write_uses_embedded_body(self):
        write = self.skill.split("### 4. Write", 1)[1].split("## Red flags", 1)[0]
        self.assertIn("--out embedded.md", write)
        self.assertIn("--body-file embedded.md", write)
        self.assertNotIn("--body-file body.md", write)

    def test_red_flags_and_mistakes(self):
        self.assertIn("## Red flags", self.skill)
        self.assertNotIn("## Common mistakes", self.skill)

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
        self.assertIn("Confirmed finding only", self.text)
        self.assertIn("Never suggest the fix", self.text)

    def test_path_steps_live_in_skill_only(self):
        drafting = (SKILL_ROOT / "references" / "drafting.md").read_text(encoding="utf-8")
        self.assertIn("Path A — from scratch", self.skill)
        self.assertIn("Path B — exploratory-tester pack", self.skill)
        self.assertNotIn("Path A — from scratch", drafting)
        self.assertNotIn("1. Interview and/or watch media", drafting)

    def test_two_collect_paths(self):
        self.assertIn("Two collect paths", self.text)
        self.assertIn("Path A — from scratch", self.text)
        self.assertIn("Path B — exploratory-tester pack", self.text)
        self.assertIn("two full loops", self.text.lower())
        self.assertIn("[<team name>]", self.text)
        self.assertIn("[Bug]", self.text)
        self.assertIn("triage_needed", self.text)
        self.assertIn("infer-release", self.text)
        self.assertIn("--type Bug", self.text)
        self.assertIn("Unknown", self.text)
        self.assertIn("Do not assume every session is local Scout", self.text)
        self.assertIn("thin", self.text.lower())
        self.assertIn("not already on that issue", self.text)
        self.assertIn("parse-findings.py", self.text)
        self.assertIn("from-findings", self.text)
        self.assertIn("1-based", self.text)
        self.assertIn("parse-search", self.text)
        self.assertIn("format-title", self.text)
        self.assertIn("infer-deployment", self.text)
        self.assertIn("check-pack", self.text)
        self.assertIn("two issues", self.text)
        self.assertNotIn("usually two issues", self.text)
        self.assertIn("URL that contains `cloud`", self.text)
        self.assertIn("stateful", self.text)
        self.assertIn("Never write `_unknown_`", self.text)
        self.assertIn("Hard stop", self.text)
        self.assertIn("Fileable checklist", self.text)
        self.assertIn("check-draft", self.text)
        self.assertIn("omit `--title`", self.skill)
        self.assertIn("scan-sensitive", self.text)
        self.assertIn("scan-wip", self.text)
        self.assertIn("file anyway", self.text.lower())
        self.assertIn("end the turn", self.text.lower())
        self.assertIn("Never write in the same turn", self.skill)
        self.assertIn("Filed via file-bug", self.text)
        self.assertIn("open and closed", self.text)
        self.assertIn("One or more", self.skill)
        self.assertIn("second", self.text.lower())
        self.assertIn("elastic/security-team", self.text)
        self.assertIn("vague", self.text.lower())
        self.assertIn("user-attachments", self.text)
        self.assertIn("embed-uploads", self.text)
        self.assertIn("![filename](url)", self.text)
        self.assertIn('<video src="url" controls></video>', self.text)
        self.assertIn("--search", self.text)
        self.assertIn("Video:", self.text)
        self.assertIn("clipped title", self.text)
        self.assertIn("Cases table", self.text)
        self.assertIn("sec-eng-prod:exploratory-tester", self.text)


if __name__ == "__main__":
    unittest.main()
