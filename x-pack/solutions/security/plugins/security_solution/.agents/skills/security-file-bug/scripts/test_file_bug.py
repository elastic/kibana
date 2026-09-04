#!/usr/bin/env python3
import json
import os
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_bug import (  # noqa: E402
    IssueMatch,
    compress_video,
    decide_write_path,
    infer_team_label,
    render_bug_body,
    upload_evidence,
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


if __name__ == "__main__":
    unittest.main()
