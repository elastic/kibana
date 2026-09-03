#!/usr/bin/env python3
import os
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_bug import IssueMatch, decide_write_path  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
