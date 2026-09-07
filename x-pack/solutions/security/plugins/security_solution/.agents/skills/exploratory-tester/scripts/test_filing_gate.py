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
        self.assertIn("security-file-bug", text)
        self.assertIn("Do not file anything they did not name", text)
        self.assertNotIn("shall I file these?", text)

    def test_phase3_does_not_auto_file(self):
        text = (ROOT / "phases" / "3-report.md").read_text(encoding="utf-8")
        self.assertIn("security-file-bug", text)
        self.assertNotIn("gh issue create", text)
        self.assertNotIn("shall I file these?", text)


if __name__ == "__main__":
    unittest.main()
