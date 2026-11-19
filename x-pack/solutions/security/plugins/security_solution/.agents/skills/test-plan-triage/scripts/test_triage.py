import io
import json
import os
import shlex
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

    def __init__(self, issues, *, comments=None, post_result=None, eval_mode=False, repo_labels=("elastic/kibana", "elastic/security-team")):
        super().__init__(command=["gh"])
        self.eval_mode = eval_mode
        self.issues = issues
        self.comments = comments or {}
        self.post_result = post_result
        self.repo_labels = repo_labels
        self.calls = []

    def run(self, args):
        self.calls.append(args)
        if "--method" in args:
            if self.post_result is None:
                return subprocess.CompletedProcess(args, 1, "", "HTTP 422: Validation Failed")
            return subprocess.CompletedProcess(args, 0, json.dumps(self.post_result), "")
        path = args[-1].split("?")[0]
        parts = path.split("/")
        if parts[3] == "labels":
            found = f"{parts[1]}/{parts[2]}" in self.repo_labels and parts[4] == "Needs%20Test%20Plan"
            return subprocess.CompletedProcess(args, 0 if found else 1, json.dumps({"name": "Needs Test Plan"}), "" if found else "gh: Not Found (HTTP 404)")
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
        self.assertEqual((result["target"]["private"], result["ancestors"][0]["private"]), (False, True))

    def test_parent_outside_the_allowed_repos_counts_as_private(self):
        issues = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/some-internal-repo#2"),
            "elastic/some-internal-repo#2": api_issue("elastic/some-internal-repo", 2, children=1),
        }
        ancestor = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))["ancestors"][0]
        self.assertEqual((ancestor["allowed_repo"], ancestor["private"]), (False, True))

    def test_unreadable_parent_is_marked_and_stops_the_walk(self):
        issues = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/kibana#2"),
            "elastic/kibana#2": api_issue("elastic/kibana", 2, parent="elastic/security-team#3", children=1),
        }
        result = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(
            result["ancestors"][1:],
            [{"ref": "elastic/security-team#3", "unreadable": True}],
        )
        self.assertEqual(result["ancestors"][0]["ref"], "elastic/kibana#2")

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
            issues[f"elastic/kibana#{number}"] = api_issue("elastic/kibana", number, parent="elastic/kibana#1", children=1 if number == 2 else 0)
        issues["elastic/kibana#5"] = api_issue("elastic/kibana", 5, parent="elastic/kibana#2")
        result = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(
            [(entry["ref"], entry["depth"]) for entry in result["descendants"]],
            [("elastic/kibana#2", 1), ("elastic/kibana#3", 1), ("elastic/kibana#4", 1), ("elastic/kibana#5", 2)],
        )
        self.assertNotIn("body", result["descendants"][0])
        self.assertFalse(result["descendants_truncated"])
        with mock.patch.object(triage, "MAX_DESCENDANTS", 3):
            capped = triage.context(FakeGh(issues), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(len(capped["descendants"]), 3)
        self.assertTrue(capped["descendants_truncated"])

    def test_gates(self):
        issues = {"elastic/kibana#1": api_issue("elastic/kibana", 1, state="closed", labels=["Needs Test Plan"])}
        comments = {"elastic/kibana#1": [{"body": "<!-- test-plan-generated -->\n# Plan", "user": {"login": "qa"}}]}
        result = triage.context(FakeGh(issues, comments=comments), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(result["gates"], ["closed", "already_labeled", "test_plan_published"])

    def test_cut_comments_are_reported(self):
        issues = {"elastic/kibana#1": api_issue("elastic/kibana", 1)}
        long_body = "x" * (triage.COMMENT_BODY_LIMIT + 1)
        comments = {"elastic/kibana#1": [{"body": "old", "user": {"login": "pm"}}, {"body": long_body, "user": {"login": "pm"}}]}
        result = triage.context(FakeGh(issues, comments=comments), triage.IssueRef("elastic/kibana", 1))
        target = result["target"]
        self.assertEqual([comment["body_truncated"] for comment in target["comments"]], [False, True])
        self.assertEqual(len(target["comments"][1]["body"]), triage.COMMENT_BODY_LIMIT)
        self.assertFalse(target["comments_truncated"])
        with mock.patch.object(triage, "MAX_COMMENTS", 1):
            capped = triage.context(FakeGh(issues, comments=comments), triage.IssueRef("elastic/kibana", 1))["target"]
        self.assertEqual([comment["body"] for comment in capped["comments"]], [long_body[: triage.COMMENT_BODY_LIMIT]])
        self.assertEqual(capped["comments_total"], 2)
        self.assertTrue(capped["comments_truncated"])

    def test_previous_no_comment_is_a_gate(self):
        issues = {"elastic/kibana#1": api_issue("elastic/kibana", 1)}
        comments = {"elastic/kibana#1": [{"body": f"{triage.NO_PLAN_MARKER}\nno", "created_at": "2026-09-15T08:00:00Z", "user": {"login": "qa"}}]}
        result = triage.context(FakeGh(issues, comments=comments), triage.IssueRef("elastic/kibana", 1))
        self.assertEqual(result["gates"], ["already_triaged"])
        self.assertEqual(result["target"]["triaged_no_at"], "2026-09-15T08:00:00Z")
        self.assertEqual((result["target"]["triaged_no_by"], result["target"]["test_plan_by"]), ("qa", None))

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
        result = triage.label(gh, self.ref, dry_run=True)
        self.assertEqual(result["action"], "dry_run")
        self.assertEqual(gh.posts(), [])

    def test_missing_label_is_never_created(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, post_result=[{"name": "Needs Test Plan"}], repo_labels=())
        for dry_run in (True, False):
            with self.assertRaises(triage.TriageError) as raised:
                triage.label(gh, self.ref, dry_run=dry_run)
            self.assertEqual(raised.exception.gate, "label_missing")
        self.assertEqual(gh.posts(), [])

    def test_eval_mode_logs_instead_of_writing(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, eval_mode=True)
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            with mock.patch.dict(os.environ, {triage.WRITE_LOG_ENV: str(log)}):
                result = triage.label(gh, self.ref, dry_run=False)
            self.assertEqual(log.read_text(encoding="utf-8"), "label elastic/kibana#1\n")
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


class CommentNoTests(unittest.TestCase):
    TODAY = triage.date(2026, 11, 12)

    def setUp(self):
        self.ref = triage.IssueRef("elastic/kibana", 1)
        self.parent = triage.IssueRef("elastic/kibana", 2)
        self.with_parent = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/kibana#2"),
            "elastic/kibana#2": api_issue("elastic/kibana", 2, children=1),
        }

    def comment(self, gh, *, rule="N4", reason="one control of the editor.", suggested=None, dry_run=False):
        return triage.comment_no(gh, self.ref, rule=rule, reason=reason, suggested=suggested, dry_run=dry_run, today=self.TODAY)

    def test_body_is_the_fixed_template(self):
        gh = FakeGh(self.with_parent)
        result = self.comment(gh, rule="n4", suggested=self.parent, dry_run=True)
        self.assertEqual(
            result["body"],
            "<!-- test-plan-triage:no-plan -->\n"
            "**Test plan triage:** no test plan needed (N4: one control of the editor). "
            "Suggested level for a test plan: [elastic/kibana#2](https://github.com/elastic/kibana/issues/2).\n\n"
            "_Decided on 2026-11-12 with the `test-plan-triage` skill._",
        )
        self.assertEqual(result["action"], "dry_run")
        self.assertEqual(gh.posts(), [])

    def test_posts_one_comment_once(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, post_result={"html_url": "https://github.com/elastic/kibana/issues/1#issuecomment-9"})
        result = self.comment(gh)
        self.assertEqual(result["action"], "commented")
        self.assertEqual(result["url"], "https://github.com/elastic/kibana/issues/1#issuecomment-9")
        self.assertEqual(len(gh.posts()), 1)
        self.assertEqual(gh.posts()[0][:4], ["api", "--method", "POST", "repos/elastic/kibana/issues/1/comments"])
        self.assertEqual(gh.posts()[0][-1], f"body={result['body']}")

    def test_failed_or_unconfirmed_comment_is_not_retried(self):
        for post_result in (None, {}):
            gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, post_result=post_result)
            with self.assertRaises(triage.TriageError):
                self.comment(gh)
            self.assertEqual(len(gh.posts()), 1)

    def test_eval_mode_logs_instead_of_writing(self):
        gh = FakeGh(self.with_parent, eval_mode=True)
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            with mock.patch.dict(os.environ, {triage.WRITE_LOG_ENV: str(log)}):
                self.assertEqual(self.comment(gh, suggested=self.parent)["action"], "would_comment")
                self.assertEqual(self.comment(gh, dry_run=True)["action"], "dry_run")
            self.assertEqual(log.read_text(encoding="utf-8"), "comment elastic/kibana#1 rule=N4 suggested=elastic/kibana#2 reason=one control of the editor\n")
        self.assertEqual(gh.posts(), [])

    def test_only_no_rules_are_accepted(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)})
        for rule in ("S1", "A1", "A4", "closed"):
            with self.assertRaises(triage.TriageError):
                self.comment(gh, rule=rule)
        self.assertEqual(gh.calls, [])

    def test_reason_must_be_one_short_line_without_mentions_or_html(self):
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)})
        for reason in ("", "two\nlines", "ping @someone", "<!-- hidden -->", "x" * (triage.REASON_LIMIT + 1)):
            with self.assertRaises(triage.TriageError):
                self.comment(gh, reason=reason)
        self.assertEqual(gh.calls, [])

    def test_suggested_level_must_be_an_open_ancestor(self):
        issues = {
            **self.with_parent,
            "elastic/kibana#3": api_issue("elastic/kibana", 3),
            "elastic/kibana#4": api_issue("elastic/kibana", 4, parent="elastic/kibana#5"),
            "elastic/kibana#5": api_issue("elastic/kibana", 5, state="closed", children=1),
        }
        for target, suggested, error in (
            (1, 1, "is not an ancestor"),
            (1, 3, "is not an ancestor"),
            (4, 5, "is closed"),
        ):
            self.ref = triage.IssueRef("elastic/kibana", target)
            gh = FakeGh(issues, post_result={"html_url": "x"})
            with self.assertRaises(triage.TriageError) as raised:
                self.comment(gh, suggested=triage.IssueRef("elastic/kibana", suggested))
            self.assertIn(error, str(raised.exception))
            self.assertEqual(gh.posts(), [])

    def test_public_issue_never_points_to_a_private_repo(self):
        private = triage.IssueRef("elastic/security-team", 2)
        cases = (
            {"suggested": private},
            {"reason": "a slice of elastic/security-team#2"},
            {"reason": "covered by the Security-Team epic"},
            {"reason": "a slice of elastic/some-internal-repo#2"},
            {"reason": "a slice of https://github.com/elastic/some-internal-repo/issues/2"},
        )
        for kwargs in cases:
            gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)})
            with self.assertRaises(triage.TriageError) as raised:
                self.comment(gh, **kwargs)
            self.assertEqual((raised.exception.exit_code, raised.exception.gate), (triage.EXIT_FAIL, "private_link"))
            self.assertEqual(gh.calls, [])

    def test_public_issue_never_names_the_repo_of_a_private_ancestor(self):
        issues = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/kibana#2"),
            "elastic/kibana#2": api_issue("elastic/kibana", 2, parent="elastic/some-internal-repo#3", children=1),
            "elastic/some-internal-repo#3": api_issue("elastic/some-internal-repo", 3, children=1),
        }
        for reason in ("tracked in some-internal-repo", "tracked in Elastic/Some-Internal-Repo"):
            gh = FakeGh(issues, post_result={"html_url": "x"})
            with self.assertRaises(triage.TriageError) as raised:
                self.comment(gh, reason=reason, suggested=self.parent)
            self.assertEqual(raised.exception.gate, "private_link")
            self.assertEqual(gh.posts(), [])
        self.assertEqual(self.comment(FakeGh(issues), suggested=self.parent, dry_run=True)["action"], "dry_run")

    def test_parent_cycle_fails_like_context(self):
        issues = {
            "elastic/kibana#1": api_issue("elastic/kibana", 1, parent="elastic/kibana#2", children=1),
            "elastic/kibana#2": api_issue("elastic/kibana", 2, parent="elastic/kibana#1", children=1),
        }
        gh = FakeGh(issues, post_result={"html_url": "x"})
        with self.assertRaises(triage.TriageError) as raised:
            self.comment(gh, suggested=self.parent)
        self.assertIn("parent cycle", str(raised.exception))
        self.assertEqual(gh.posts(), [])

    def test_private_issue_may_point_to_a_private_repo(self):
        self.ref = triage.IssueRef("elastic/security-team", 1)
        gh = FakeGh({
            "elastic/security-team#1": api_issue("elastic/security-team", 1, parent="elastic/security-team#2"),
            "elastic/security-team#2": api_issue("elastic/security-team", 2, children=1),
        })
        result = self.comment(gh, suggested=triage.IssueRef("elastic/security-team", 2), dry_run=True)
        self.assertIn("(https://github.com/elastic/security-team/issues/2)", result["body"])

    def test_closed_issues_and_pull_requests_get_no_comment(self):
        for issue in (api_issue("elastic/kibana", 1, state="closed"), api_issue("elastic/kibana", 1, pr=True)):
            gh = FakeGh({"elastic/kibana#1": issue}, post_result={"html_url": "x"})
            with self.assertRaises(triage.TriageError):
                self.comment(gh)
            self.assertEqual(gh.posts(), [])

    def test_labeled_issue_or_published_plan_asks(self):
        cases = (
            ({"elastic/kibana#1": api_issue("elastic/kibana", 1, labels=["Needs Test Plan"])}, {}, "already_labeled"),
            ({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, {"elastic/kibana#1": [{"body": "<!-- test-plan-generated -->\n# Plan"}]}, "test_plan_published"),
        )
        for issues, comments, gate in cases:
            gh = FakeGh(issues, comments=comments, post_result={"html_url": "x"})
            with self.assertRaises(triage.TriageError) as raised:
                self.comment(gh)
            self.assertEqual((raised.exception.exit_code, raised.exception.gate), (triage.EXIT_ASK, gate))
            self.assertEqual(gh.posts(), [])

    def test_second_no_comment_is_not_posted(self):
        comments = {"elastic/kibana#1": [{"body": f"{triage.NO_PLAN_MARKER}\nearlier"}]}
        gh = FakeGh({"elastic/kibana#1": api_issue("elastic/kibana", 1)}, comments=comments, post_result={"html_url": "x"})
        self.assertEqual(self.comment(gh)["reason"], "already_triaged")
        self.assertEqual(gh.posts(), [])


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

    def test_comment_no_has_no_reason_argument(self):
        code, payload = self.run_main(["comment-no", "--issue", "elastic/kibana#1", "--rule", "N2", "--reason", "x"], gh=FakeGh({}))
        self.assertEqual(code, triage.EXIT_FAIL)
        self.assertIn("--reason", payload["error"])

    def test_comment_no_refuses_a_terminal_as_stdin(self):
        class Terminal(io.StringIO):
            def isatty(self):
                return True

        out = io.StringIO()
        with redirect_stdout(out):
            code = triage.main(["comment-no", "--issue", "elastic/kibana#1", "--rule", "N2"], gh=FakeGh({}), stdin=Terminal())
        self.assertEqual(code, triage.EXIT_FAIL)
        self.assertIn("stdin", json.loads(out.getvalue())["error"])


class StubCliTests(unittest.TestCase):
    """The evals stub and the real CLI agree on the API shapes."""

    def run_cli(self, *args, extra_env=None, stdin=None):
        env = {**os.environ, triage.GH_ENV: f"{sys.executable} {STUB}", **(extra_env or {})}
        completed = subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "triage.py"), *args], input=stdin, capture_output=True, text=True, env=env, check=False
        )
        return completed.returncode, json.loads(completed.stdout)

    def test_context_walks_the_fixture_chain(self):
        code, payload = self.run_cli("context", "--issue", "elastic/kibana#910404")
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["ancestors"][-1]["ref"], "elastic/security-team#910400")
        self.assertEqual(len(payload["ancestors"]), 4)

    def test_context_marks_a_parent_missing_from_the_fixtures_as_unreadable(self):
        code, payload = self.run_cli("context", "--issue", "elastic/kibana#911201")
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["ancestors"], [{"ref": "elastic/security-team#911200", "unreadable": True}])

    def test_label_never_writes_through_the_stub(self):
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            code, payload = self.run_cli("label", "--issue", "elastic/kibana#910101", extra_env={triage.WRITE_LOG_ENV: str(log)})
            self.assertEqual(code, 0, payload)
            self.assertTrue(payload["simulated"])
            self.assertEqual(log.read_text(encoding="utf-8"), "label elastic/kibana#910101\n")

    def test_comment_no_never_writes_through_the_stub(self):
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            code, payload = self.run_cli(
                "comment-no", "--issue", "elastic/kibana#911401", "--rule", "N2",
                extra_env={triage.WRITE_LOG_ENV: str(log)}, stdin="internal state refactor\n",
            )
            self.assertEqual(code, 0, payload)
            self.assertTrue(payload["simulated"])
            self.assertEqual(log.read_text(encoding="utf-8"), "comment elastic/kibana#911401 rule=N2 suggested=none reason=internal state refactor\n")

    def test_a_quoted_heredoc_passes_shell_syntax_in_the_reason_as_text(self):
        reason = "adds a `touch expanded` row action $(touch expanded)"
        with tempfile.TemporaryDirectory() as tmp:
            log = Path(tmp) / "writes.log"
            script = (
                f"{shlex.quote(sys.executable)} {shlex.quote(str(SCRIPT_DIR / 'triage.py'))} "
                f"comment-no --issue elastic/kibana#911401 --rule N2 <<'REASON'\n{reason}\nREASON\n"
            )
            completed = subprocess.run(
                ["bash", "-c", script],
                cwd=tmp,
                env={**os.environ, triage.GH_ENV: f"{sys.executable} {STUB}", triage.WRITE_LOG_ENV: str(log)},
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
            self.assertFalse((Path(tmp) / "expanded").exists())
            self.assertIn(f"reason={reason}", log.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
