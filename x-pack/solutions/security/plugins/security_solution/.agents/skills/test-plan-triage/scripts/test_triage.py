import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

import triage

SCRIPT_DIR = Path(__file__).resolve().parent
STUB = SCRIPT_DIR.parent / "evals" / "stub-gh.py"


def api_issue(repo, number, *, title="t", state="open", labels=(), parent=None, children=0, pr=False, body=""):
    issue = {
        "number": number,
        "title": title,
        "state": state,
        "body": body,
        "html_url": f"https://github.com/{repo}/issues/{number}",
        "repository_url": f"https://api.github.com/repos/{repo}",
        "type": None,
        "labels": [{"name": name} for name in labels],
        "sub_issues_summary": {"total": children},
    }
    if parent:
        parent_repo, parent_number = parent.split("#")
        issue["parent_issue_url"] = f"https://api.github.com/repos/{parent_repo}/issues/{parent_number}"
    if pr:
        issue["pull_request"] = {"url": "x"}
    return issue


class FakeGh(triage.Gh):
    """Serves issues from a dict; records every call; POST answers are configurable."""

    def __init__(self, issues, *, comments=None, post_result=None, eval_mode=False):
        super().__init__(command=["gh"])
        self.eval_mode = eval_mode
        self.issues = issues
        self.comments = comments or {}
        self.post_result = post_result
        self.calls = []

    def run(self, args):
        self.calls.append(args)
        if "--method" in args:
            if self.post_result is None:
                return subprocess.CompletedProcess(args, 1, "", "HTTP 422: Validation Failed")
            return subprocess.CompletedProcess(args, 0, json.dumps(self.post_result), "")
        path = args[-1].split("?")[0]
        parts = path.split("/")
        ref = f"{parts[1]}/{parts[2]}#{parts[4]}"
        if ref not in self.issues:
            return subprocess.CompletedProcess(args, 1, "", "gh: Not Found (HTTP 404)")
        if path.endswith("/sub_issues"):
            children = [issue for issue in self.issues.values() if issue.get("parent_issue_url", "").endswith(f"/{parts[1]}/{parts[2]}/issues/{parts[4]}")]
            return subprocess.CompletedProcess(args, 0, json.dumps([children]), "")
        if path.endswith("/comments"):
            return subprocess.CompletedProcess(args, 0, json.dumps([self.comments.get(ref, [])]), "")
        return subprocess.CompletedProcess(args, 0, json.dumps(self.issues[ref]), "")

    def posts(self):
        return [call for call in self.calls if "--method" in call]


def chain(length, repo="elastic/kibana", start=1000):
    """A parent chain: start is the root, start + length - 1 the leaf."""
    issues = {}
    for offset in range(length):
        number = start + offset
        parent = f"{repo}#{number - 1}" if offset else None
        issues[f"{repo}#{number}"] = api_issue(repo, number, title=f"level {offset}", parent=parent, children=0 if offset == length - 1 else 1)
    return issues


class ParseRefTests(unittest.TestCase):
    def test_accepts_urls_and_short_refs(self):
        self.assertEqual(str(triage.parse_ref("https://github.com/elastic/kibana/issues/12")), "elastic/kibana#12")
        self.assertEqual(str(triage.parse_ref("https://github.com/Elastic/Security-Team/issues/7#issuecomment-1")), "elastic/security-team#7")
        self.assertEqual(str(triage.parse_ref("elastic/security-team#99")), "elastic/security-team#99")

    def test_missing_repo_asks(self):
        for value in ("#12", "12", "kibana#12"):
            with self.assertRaises(triage.TriageError) as raised:
                triage.parse_ref(value)
            self.assertEqual(raised.exception.exit_code, triage.EXIT_ASK)
            self.assertEqual(raised.exception.gate, "repo_missing")

    def test_other_repo_asks(self):
        with self.assertRaises(triage.TriageError) as raised:
            triage.parse_ref("elastic/beats#1")
        self.assertEqual(raised.exception.exit_code, triage.EXIT_ASK)
        self.assertEqual(raised.exception.gate, "repo_not_allowed")


class ContextTests(unittest.TestCase):
    def test_walks_every_ancestor_beyond_eight_levels(self):
        issues = chain(12)
        result = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1011))
        self.assertEqual([entry["ref"] for entry in result["ancestors"]], [f"elastic/kibana#{n}" for n in range(1010, 999, -1)])
        self.assertEqual(result["ancestors"][0]["children"][0]["on_chain"], True)

    def test_cross_repo_parent_is_read_and_marked(self):
        issues = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/security-team#2"),
            "elastic/security-team#2": api_issue("elastic/security-team", 2, children=1),
        }
        result = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(result["ancestors"][0]["ref"], "elastic/security-team#2")
        self.assertTrue(result["ancestors"][0]["allowed_repo"])

    def test_parent_cycle_fails(self):
        issues = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/kibana#2", children=1),
            "elastic/kibana#2": api_issue("elastic/kibana", 2, parent="elastic/kibana#1", children=1),
        }
        with self.assertRaises(triage.TriageError):
            triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))

    def test_descendants_are_breadth_first_and_capped(self):
        issues = {"elastic/kibana#1": api_issue("elastic/kibana", 1, children=3)}
        for number in (2, 3, 4):
            issues[f"elastic/kibana#{number}"] = api_issue("elastic/kibana", number, parent="elastic/kibana#1")
        result = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual([entry["ref"] for entry in result["descendants"]], ["elastic/kibana#2", "elastic/kibana#3", "elastic/kibana#4"])
        self.assertNotIn("body", result["descendants"][0])
        self.assertFalse(result["descendants_truncated"])
        with mock.patch.object(triage, "MAX_DESCENDANTS", 2):
            capped = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(len(capped["descendants"]), 2)
        self.assertTrue(capped["descendants_truncated"])

    def test_gates(self):
        issues = {"elastic/kibana#1": api_issue("elastic/kibana", 1, state="closed", labels=["Needs Test Plan"])}
        comments = {"elastic/kibana#1": [{"body": "<!-- test-plan-generated -->\n# Plan", "user": {"login": "qa"}}]}
        result = triage.context(FakeGh(issues, comments=comments), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(result["gates"], ["closed", "already_labeled", "test_plan_published"])

    def test_pull_request_stops_early(self):
        issues = {"elastic/kibana#1": api_issue("elastic/kibana", 1, pr=True)}
        gh = FakeGh(issues)
        result = triage.context(gh, triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(result["gates"], ["pull_request"])
        self.assertEqual(len(gh.calls), 1)

    def test_missing_issue_fails(self):
        with self.assertRaises(triage.TriageError) as raised:
            triage.context(FakeGh({}), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(raised.exception.gate, "not_found")


class LabelTests(unittest.TestCase):
    def setUp(self):
        self.ref = triage.IssueRef("elastic/kibana", 1)

    def test_closed_issue_is_never_labeled(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1, state="closed")})
        with self.assertRaises(triage.TriageError) as raised:
            triage.label(gh, self.ref, dry_run=False)
        self.assertEqual(raised.exception.gate, "closed")
        self.assertEqual(gh.posts(), [])

    def test_pull_request_is_never_labeled(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1, pr=True)})
        with self.assertRaises(triage.TriageError):
            triage.label(gh, self.ref, dry_run=False)
        self.assertEqual(gh.posts(), [])

    def test_already_labeled_writes_nothing(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1, labels=["needs test plan"])})
        self.assertEqual(triage.label(gh, self.ref, dry_run=False)["action"], "none")
        self.assertEqual(gh.posts(), [])

    def test_dry_run_writes_nothing(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)})
        self.assertEqual(triage.label(gh, self.ref, dry_run=True)["action"], "would_label")
        self.assertEqual(gh.posts(), [])

    def test_eval_mode_logs_instead_of_writing(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, eval_mode=True)
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            with mock.patch.dict(os.environ, {triage.WRITE_LOG_ENV: str(log)}):
                result = triage.label(gh, self.ref, dry_run=False)
            self.assertEqual(log.read_text(encoding="utf-8"), "elastic/kibana#1\n")
        self.assertTrue(result["simulated"])
        self.assertEqual(gh.posts(), [])

    def test_writes_one_label_once(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, post_result=[{"name": "Needs Test Plan"}])
        self.assertEqual(triage.label(gh, self.ref, dry_run=False)["action"], "labeled")
        self.assertEqual(
            gh.posts(),
            [["api", "--method", "POST", "repos/elastic/kibana/issues/1/labels", "-f", "labels[]=Needs Test Plan"]],
        )

    def test_failed_write_is_not_retried(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, post_result=None)
        with self.assertRaises(triage.TriageError):
            triage.label(gh, self.ref, dry_run=False)
        self.assertEqual(len(gh.posts()), 1)

    def test_unconfirmed_write_fails(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, post_result=[{"name": "bug"}])
        with self.assertRaises(triage.TriageError):
            triage.label(gh, self.ref, dry_run=False)
        self.assertEqual(len(gh.posts()), 1)


class MainTests(unittest.TestCase):
    def run_main(self, argv, gh=None):
        out = io.StringIO()
        with redirect_stdout(out):
            code = triage.main(argv, gh=gh)
        return code, json.loads(out.getvalue())

    def test_bad_arguments_fail_with_json(self):
        code, payload = self.run_main(["label"])
        self.assertEqual(code, triage.EXIT_FAIL)
        self.assertFalse(payload["ok"])

    def test_other_repo_exits_ask(self):
        code, payload = self.run_main(["context", "--issue", "elastic/beats#1"], gh=FakeGh({}))
        self.assertEqual(code, triage.EXIT_ASK)
        self.assertEqual(payload["gate"], "repo_not_allowed")


class StubCliTests(unittest.TestCase):
    """The evals stub and the real CLI agree on the API shapes."""

    def run_cli(self, *args, extra_env=None):
        env = {**os.environ, triage.GH_ENV: f"{sys.executable} {STUB}", **(extra_env or {})}
        completed = subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "triage.py"), *args], capture_output=True, text=True, env=env, check=False
        )
        return completed.returncode, json.loads(completed.stdout)

    def test_context_walks_the_fixture_chain(self):
        code, payload = self.run_cli("context", "--issue", "elastic/kibana#900305")
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["ancestors"][-1]["ref"], "elastic/kibana#900300")
        self.assertEqual(len(payload["ancestors"]), 5)

    def test_label_never_writes_through_the_stub(self):
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            code, payload = self.run_cli("label", "--issue", "elastic/kibana#900101", extra_env={triage.WRITE_LOG_ENV: str(log)})
            self.assertEqual(code, 0, payload)
            self.assertTrue(payload["simulated"])
            self.assertEqual(log.read_text(encoding="utf-8"), "elastic/kibana#900101\n")


if __name__ == "__main__":
    unittest.main()
