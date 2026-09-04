#!/usr/bin/env python3
import json
import os
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_bug import (  # noqa: E402
    IssueMatch,
    decide_write_path,
    infer_team_label,
    render_bug_body,
    validate_labels,
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
    def test_uses_official_headings_and_finding_fields(self):
        finding = json.loads((FIXTURES / "finding.json").read_text())
        config = json.loads((FIXTURES / "session-config.json").read_text())
        body = render_bug_body(finding, config)
        self.assertIn("**Kibana version:**", body)
        self.assertIn("9.3.0", body)
        self.assertIn("Open Entity Analytics", body)
        self.assertIn("Table shows 0 entities", body)
        self.assertIn("Table lists entities in range", body)
        self.assertIn("TypeError: cannot read map of undefined", body)
        self.assertIn("t2_analyst", body)
        self.assertNotIn("**Describe the bug:**\n\n**Steps", body)


if __name__ == "__main__":
    unittest.main()
