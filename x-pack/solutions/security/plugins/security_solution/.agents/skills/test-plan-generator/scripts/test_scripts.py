import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
RESOLVE = SCRIPT_DIR / "resolve_verbosity.sh"
PUBLISH = SCRIPT_DIR / "publish_test_plan.sh"
MARKER = "<!-- test-plan-generated -->"
TOKENS = "<!-- tokens: input=1 output=2 cache_create=3 cache_read=4 total=10 -->"


class ScriptTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def write(self, content: str) -> Path:
        path = Path(self.tmp.name) / "body.md"
        path.write_text(content, encoding="utf-8")
        return path

    def run_script(self, script: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["bash", str(script), *args],
            capture_output=True,
            text=True,
            check=False,
        )


class ResolveVerbosityTests(ScriptTestCase):
    def resolve(self, body: str, *args: str) -> dict[str, str]:
        result = self.run_script(RESOLVE, *args, "--body-file", str(self.write(body)))
        self.assertEqual(result.returncode, 0, result.stderr)
        return dict(line.split("=", 1) for line in result.stdout.splitlines())

    def test_published_marker_is_kept_without_keyword(self) -> None:
        values = self.resolve(f"{MARKER}\n<!-- verbosity: lean -->\n# Plan\n")
        self.assertEqual(
            values,
            {
                "PUBLISHED_VERBOSITY_LEVEL": "lean",
                "VERBOSITY_LEVEL": "lean",
                "BASELINE_VERBOSITY_LEVEL": "lean",
                "VMIG": "false",
                "LEVEL_CHANGED": "false",
            },
        )

    def test_keyword_overrides_published_marker(self) -> None:
        values = self.resolve(f"{MARKER}\n<!-- verbosity: lean -->\n", "--keyword", "Detailed")
        self.assertEqual(values["VERBOSITY_LEVEL"], "detailed")
        self.assertEqual(values["BASELINE_VERBOSITY_LEVEL"], "lean")
        self.assertEqual(values["LEVEL_CHANGED"], "true")

    def test_legacy_plan_without_keyword_is_only_a_marker_migration(self) -> None:
        values = self.resolve(f"{MARKER}\n# Plan\n")
        self.assertEqual(values["PUBLISHED_VERBOSITY_LEVEL"], "none")
        self.assertEqual(values["VERBOSITY_LEVEL"], "standard")
        self.assertEqual(values["BASELINE_VERBOSITY_LEVEL"], "standard")
        self.assertEqual(values["VMIG"], "true")
        self.assertEqual(values["LEVEL_CHANGED"], "false")

    def test_legacy_plan_with_keyword_is_migration_and_level_change(self) -> None:
        values = self.resolve(f"{MARKER}\n# Plan\n", "--keyword", "lean")
        self.assertEqual(values["VMIG"], "true")
        self.assertEqual(values["LEVEL_CHANGED"], "true")
        self.assertEqual(values["BASELINE_VERBOSITY_LEVEL"], "standard")

    def test_invalid_marker_value_counts_as_missing(self) -> None:
        values = self.resolve(f"{MARKER}\n<!-- verbosity: verbose -->\n")
        self.assertEqual(values["PUBLISHED_VERBOSITY_LEVEL"], "none")

    def test_body_without_test_plan_marker_fails(self) -> None:
        result = self.run_script(RESOLVE, "--body-file", str(self.write("# Not a plan\n")))
        self.assertEqual(result.returncode, 67)

    def test_invalid_keyword_fails(self) -> None:
        result = self.run_script(
            RESOLVE, "--keyword", "verbose", "--body-file", str(self.write(f"{MARKER}\n"))
        )
        self.assertEqual(result.returncode, 64)


class PublishNormalizationTests(ScriptTestCase):
    def dry_run(self, draft: str, *args: str) -> subprocess.CompletedProcess[str]:
        return self.run_script(PUBLISH, "--dry-run", *args, "1", str(self.write(draft)))

    def test_draft_save_markers_get_publish_markers_on_top(self) -> None:
        result = self.dry_run(f"<!-- verbosity: lean -->\n{TOKENS}\n# Plan\n", "--model", "claude-sonnet-4-6")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            result.stdout,
            f"{MARKER}\n<!-- generated-by: claude-sonnet-4-6 -->\n<!-- verbosity: lean -->\n{TOKENS}\n# Plan\n",
        )

    def test_markers_in_any_order_are_reordered(self) -> None:
        draft = f"{TOKENS}\n\n<!-- generated-by: gpt-5 -->\n{MARKER}\n<!-- verbosity: detailed -->\n# Plan\n"
        result = self.dry_run(draft)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            result.stdout,
            f"{MARKER}\n<!-- generated-by: gpt-5 -->\n<!-- verbosity: detailed -->\n{TOKENS}\n# Plan\n",
        )

    def test_blank_line_after_markers_is_kept(self) -> None:
        result = self.dry_run("<!-- verbosity: lean -->\n\n# Plan\n", "--model", "gpt-5")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.endswith("<!-- verbosity: lean -->\n\n# Plan\n"))

    def test_model_with_spaces_and_parentheses_is_accepted(self) -> None:
        result = self.dry_run("# Plan\n", "--model", "cursor-agent claude-sonnet-5-5-medium")
        self.assertIn("<!-- generated-by: cursor-agent claude-sonnet-5-5-medium -->", result.stdout)
        result = self.dry_run("<!-- generated-by: Claude Sonnet 4.6 (thinking) -->\n# Plan\n")
        self.assertIn("<!-- generated-by: Claude Sonnet 4.6 (thinking) -->", result.stdout)

    def test_update_draft_with_published_markers_left_on_top_fails(self) -> None:
        draft = f"<!-- verbosity: standard -->\n{TOKENS}\n{MARKER}\n<!-- generated-by: m -->\n{TOKENS}\n# Plan\n"
        result = self.dry_run(draft, "--model", "m")
        self.assertEqual(result.returncode, 65)
        self.assertIn("published comment", result.stderr)

    def test_model_flag_replaces_draft_model(self) -> None:
        result = self.dry_run(f"<!-- generated-by: old -->\n<!-- verbosity: standard -->\n# Plan\n", "--model", "new")
        self.assertIn("<!-- generated-by: new -->", result.stdout)
        self.assertNotIn("old", result.stdout)

    def test_missing_verbosity_becomes_standard(self) -> None:
        result = self.dry_run("# Plan\n", "--model", "gpt-5")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("<!-- verbosity: standard -->", result.stdout)
        self.assertNotIn("tokens", result.stdout)

    def test_markers_inside_the_body_are_left_alone(self) -> None:
        result = self.dry_run("<!-- verbosity: lean -->\n# Plan\n<!-- verbosity: detailed -->\n", "--model", "gpt-5")
        self.assertTrue(result.stdout.endswith("# Plan\n<!-- verbosity: detailed -->\n"))

    def test_missing_model_fails(self) -> None:
        self.assertEqual(self.dry_run("<!-- verbosity: lean -->\n# Plan\n").returncode, 65)

    def test_model_that_could_close_the_comment_fails(self) -> None:
        self.assertEqual(self.dry_run("# Plan\n", "--model", "x -->").returncode, 64)
        self.assertEqual(self.dry_run("<!-- generated-by: a --> b -->\n# Plan\n").returncode, 65)

    def test_duplicated_or_invalid_markers_fail(self) -> None:
        self.assertEqual(self.dry_run("<!-- verbosity: lean -->\n<!-- verbosity: lean -->\n", "--model", "m").returncode, 65)
        self.assertEqual(self.dry_run("<!-- verbosity: verbose -->\n", "--model", "m").returncode, 65)
        self.assertEqual(self.dry_run("<!-- tokens: total=0 -->\n", "--model", "m").returncode, 65)

    def test_dry_run_keeps_the_draft(self) -> None:
        draft = self.write("# Plan\n")
        self.run_script(PUBLISH, "--dry-run", "--model", "m", "1", str(draft))
        self.assertTrue(draft.exists())


if __name__ == "__main__":
    unittest.main()
