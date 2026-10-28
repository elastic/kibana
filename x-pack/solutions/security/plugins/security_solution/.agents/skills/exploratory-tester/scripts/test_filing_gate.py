#!/usr/bin/env python3
import os
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"

ROOT = Path(__file__).resolve().parents[1]


class FilingGateTest(unittest.TestCase):
    def test_skill_banner_points_at_file_bug(self):
        text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("file-bug", text)
        self.assertIn("Do not file anything they did not name", text)
        self.assertIn("you may ask whether they want any findings filed", text)
        self.assertIn("Do not write to GitHub from this skill", text)
        self.assertNotIn("Do not offer to file anything on your own initiative", text)

    def test_phase3_may_offer_then_handoff(self):
        text = (ROOT / "phases" / "3-report.md").read_text(encoding="utf-8")
        self.assertIn("file-bug", text)
        self.assertIn("Do you want any of these findings filed as Kibana issues?", text)
        self.assertIn("Yes\" without names is not enough", text)
        self.assertIn("Do not run `gh issue create`", text)
        self.assertIn("sec-eng-prod:exploratory-tester", text)
        self.assertNotIn("Do not offer to file anything on your own initiative", text)


if __name__ == "__main__":
    unittest.main()
