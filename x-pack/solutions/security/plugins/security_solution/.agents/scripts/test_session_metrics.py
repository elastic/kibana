import json
import math
import os
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from session_metrics import (  # noqa: E402
    TokenTotals,
    format_legacy_usage,
    parse_transcript,
    resolve_transcript,
)


class SessionMetricsParserTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
