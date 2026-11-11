#!/usr/bin/env python3
"""Read an issue's hierarchy and add the `Needs Test Plan` label (test-plan-triage skill).

Commands (JSON on stdout; exit 0 ok, 1 failure, 2 the agent must ask the user):
  context --issue <ref>             Read-only. The issue, every ancestor up to the root, and
                                    the descendant tree.
  label --issue <ref> [--dry-run]   Add `Needs Test Plan` to one open issue. Never retried.

<ref> is a GitHub issue URL or `owner/repo#N`. Only elastic/kibana and
elastic/security-team are accepted.

TEST_PLAN_TRIAGE_GH replaces `gh` with another command (the evals stub). While it is set,
`label` never writes: it reports what it would write and, if TEST_PLAN_TRIAGE_WRITE_LOG
names a file, appends the issue ref to it.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from typing import Any, Optional

ALLOWED_REPOS = ("elastic/kibana", "elastic/security-team")
LABEL = "Needs Test Plan"
TEST_PLAN_MARKER = "<!-- test-plan-generated -->"
GH_ENV = "TEST_PLAN_TRIAGE_GH"
WRITE_LOG_ENV = "TEST_PLAN_TRIAGE_WRITE_LOG"

EXIT_OK = 0
EXIT_FAIL = 1
EXIT_ASK = 2

MAX_DESCENDANTS = 200
MAX_ANCESTORS = 50
TARGET_BODY_LIMIT = 20000
ANCESTOR_BODY_LIMIT = 1500
COMMENT_BODY_LIMIT = 1000
MAX_COMMENTS = 30

_URL_RE = re.compile(
    r"^https?://github\.com/(?P<repo>[\w.-]+/[\w.-]+)/(?:issues|pull)/(?P<number>\d+)(?:[/?#].*)?$"
)
_SHORT_RE = re.compile(r"^(?P<repo>[\w.-]+/[\w.-]+)#(?P<number>\d+)$")
_API_ISSUE_RE = re.compile(r"/repos/(?P<repo>[\w.-]+/[\w.-]+)/issues/(?P<number>\d+)$")


class TriageError(Exception):
    def __init__(self, message: str, *, exit_code: int = EXIT_FAIL, gate: Optional[str] = None):
        super().__init__(message)
        self.exit_code = exit_code
        self.gate = gate


class NotFound(TriageError):
    pass


@dataclass(frozen=True)
class IssueRef:
    repo: str
    number: int

    def __str__(self) -> str:
        return f"{self.repo}#{self.number}"


def parse_ref(value: str) -> IssueRef:
    """Parse an issue URL or `owner/repo#N`; reject anything else."""
    text = value.strip()
    match = _URL_RE.match(text) or _SHORT_RE.match(text)
    if not match:
        raise TriageError(
            f"cannot read '{value}': pass an issue URL or owner/repo#N (the repo is required)",
            exit_code=EXIT_ASK,
            gate="repo_missing",
        )
    ref = IssueRef(match.group("repo").lower(), int(match.group("number")))
    if ref.repo not in ALLOWED_REPOS:
        raise TriageError(
            f"{ref.repo} is not supported; only {', '.join(ALLOWED_REPOS)}",
            exit_code=EXIT_ASK,
            gate="repo_not_allowed",
        )
    return ref


def ref_from_api_url(url: str) -> IssueRef:
    match = _API_ISSUE_RE.search(url or "")
    if not match:
        raise TriageError(f"unexpected issue API URL '{url}'")
    return IssueRef(match.group("repo").lower(), int(match.group("number")))


def repo_from_issue(issue: dict) -> str:
    url = issue.get("repository_url") or ""
    match = re.search(r"/repos/([\w.-]+/[\w.-]+)$", url)
    if not match:
        raise TriageError(f"unexpected repository_url '{url}'")
    return match.group(1).lower()


class Gh:
    """Thin wrapper over `gh api`; only GET requests and one label POST."""

    def __init__(self, command: Optional[list[str]] = None) -> None:
        override = os.environ.get(GH_ENV)
        self.eval_mode = bool(override)
        self.command = command or (shlex.split(override) if override else ["gh"])

    def run(self, args: list[str]) -> subprocess.CompletedProcess:
        try:
            return subprocess.run(
                [*self.command, *args],
                check=False,
                capture_output=True,
                text=True,
                env={**os.environ, "GH_PAGER": "cat"},
            )
        except FileNotFoundError as error:
            raise TriageError("gh CLI is not installed; see https://cli.github.com/") from error

    def _json(self, args: list[str]) -> Any:
        completed = self.run(args)
        if completed.returncode != 0:
            stderr = completed.stderr.strip()
            if "HTTP 404" in stderr or "Not Found" in stderr:
                raise NotFound(f"not found: {args[-1]}")
            raise TriageError(f"`gh {' '.join(args)}` failed: {stderr or 'no stderr'}")
        try:
            return json.loads(completed.stdout)
        except json.JSONDecodeError as error:
            raise TriageError(f"`gh {' '.join(args)}` returned invalid JSON") from error

    def get(self, path: str) -> dict:
        return self._json(["api", path])

    def get_list(self, path: str) -> list:
        pages = self._json(["api", "--paginate", "--slurp", path])
        return [item for page in pages for item in page]

    def add_label(self, ref: IssueRef) -> list:
        return self._json(
            [
                "api",
                "--method",
                "POST",
                f"repos/{ref.repo}/issues/{ref.number}/labels",
                "-f",
                f"labels[]={LABEL}",
            ]
        )


def _excerpt(text: Optional[str], limit: int) -> tuple[str, bool]:
    body = text or ""
    if len(body) <= limit:
        return body, False
    return body[:limit], True


def _labels(issue: dict) -> list[str]:
    return [label["name"] if isinstance(label, dict) else str(label) for label in issue.get("labels") or []]


def _has_label(issue: dict) -> bool:
    return any(name.casefold() == LABEL.casefold() for name in _labels(issue))


def summarize(issue: dict, *, body_limit: Optional[int]) -> dict:
    repo = repo_from_issue(issue)
    summary = {
        "ref": f"{repo}#{issue['number']}",
        "url": issue.get("html_url"),
        "title": issue.get("title") or "",
        "state": issue.get("state"),
        "type": (issue.get("type") or {}).get("name"),
        "labels": _labels(issue),
        "has_label": _has_label(issue),
        "is_pull_request": bool(issue.get("pull_request")),
        "sub_issues_total": (issue.get("sub_issues_summary") or {}).get("total", 0),
        "allowed_repo": repo in ALLOWED_REPOS,
    }
    if body_limit is not None:
        body, truncated = _excerpt(issue.get("body"), body_limit)
        summary["body"] = body
        summary["body_truncated"] = truncated
    return summary


def _ref(issue: dict) -> IssueRef:
    return IssueRef(repo_from_issue(issue), int(issue["number"]))


def has_test_plan(gh: Gh, ref: IssueRef, comments: Optional[list] = None) -> bool:
    items = comments if comments is not None else gh.get_list(f"repos/{ref.repo}/issues/{ref.number}/comments?per_page=100")
    return any((comment.get("body") or "").lstrip().startswith(TEST_PLAN_MARKER) for comment in items)


def sub_issues(gh: Gh, ref: IssueRef) -> list:
    return gh.get_list(f"repos/{ref.repo}/issues/{ref.number}/sub_issues?per_page=100")


def fetch_issue(gh: Gh, ref: IssueRef) -> dict:
    try:
        return gh.get(f"repos/{ref.repo}/issues/{ref.number}")
    except NotFound as error:
        raise TriageError(f"{ref} does not exist or you have no access", gate="not_found") from error


def collect_ancestors(gh: Gh, issue: dict) -> list[dict]:
    """Walk parent links until there is none; no fixed depth."""
    ancestors: list[dict] = []
    seen = {str(_ref(issue))}
    current = issue
    child_ref = str(_ref(issue))
    while current.get("parent_issue_url"):
        if len(ancestors) >= MAX_ANCESTORS:
            raise TriageError(f"more than {MAX_ANCESTORS} ancestors; stopping")
        parent_ref = ref_from_api_url(current["parent_issue_url"])
        if str(parent_ref) in seen:
            raise TriageError(f"parent cycle at {parent_ref}")
        seen.add(str(parent_ref))
        parent = gh.get(f"repos/{parent_ref.repo}/issues/{parent_ref.number}")
        entry = summarize(parent, body_limit=ANCESTOR_BODY_LIMIT)
        entry["has_test_plan"] = has_test_plan(gh, parent_ref)
        entry["children"] = [
            {
                "ref": str(_ref(child)),
                "title": child.get("title") or "",
                "state": child.get("state"),
                "type": (child.get("type") or {}).get("name"),
                "sub_issues_total": (child.get("sub_issues_summary") or {}).get("total", 0),
                "on_chain": str(_ref(child)) == child_ref,
            }
            for child in sub_issues(gh, parent_ref)
        ]
        ancestors.append(entry)
        child_ref = str(parent_ref)
        current = parent
    return ancestors


def collect_descendants(gh: Gh, issue: dict) -> tuple[list[dict], bool]:
    """Breadth-first sub-issue tree, titles only, capped at MAX_DESCENDANTS."""
    descendants: list[dict] = []
    queue: list[tuple[dict, int]] = [(issue, 0)]
    seen = {str(_ref(issue))}
    while queue:
        node, depth = queue.pop(0)
        if not (node.get("sub_issues_summary") or {}).get("total"):
            continue
        for child in sub_issues(gh, _ref(node)):
            child_ref = str(_ref(child))
            if child_ref in seen:
                continue
            if len(descendants) >= MAX_DESCENDANTS:
                return descendants, True
            seen.add(child_ref)
            entry = summarize(child, body_limit=None)
            entry["depth"] = depth + 1
            entry["parent"] = str(_ref(node))
            descendants.append(entry)
            queue.append((child, depth + 1))
    return descendants, False


def context(gh: Gh, ref: IssueRef) -> dict:
    issue = fetch_issue(gh, ref)
    target = summarize(issue, body_limit=TARGET_BODY_LIMIT)
    gates = []
    if target["is_pull_request"]:
        gates.append("pull_request")
        return {"ok": True, "target": target, "gates": gates, "ancestors": [], "descendants": []}
    comments = gh.get_list(f"repos/{ref.repo}/issues/{ref.number}/comments?per_page=100")
    target["has_test_plan"] = has_test_plan(gh, ref, comments)
    target["comments"] = [
        {
            "author": (comment.get("user") or {}).get("login"),
            "created_at": comment.get("created_at"),
            "body": _excerpt(comment.get("body"), COMMENT_BODY_LIMIT)[0],
        }
        for comment in comments[-MAX_COMMENTS:]
    ]
    target["comments_total"] = len(comments)
    if target["state"] != "open":
        gates.append("closed")
    if target["has_label"]:
        gates.append("already_labeled")
    if target["has_test_plan"]:
        gates.append("test_plan_published")
    ancestors = collect_ancestors(gh, issue)
    descendants, truncated = collect_descendants(gh, issue)
    return {
        "ok": True,
        "label": LABEL,
        "target": target,
        "gates": gates,
        "ancestors": ancestors,
        "descendants": descendants,
        "descendants_truncated": truncated,
    }


def label(gh: Gh, ref: IssueRef, *, dry_run: bool) -> dict:
    issue = fetch_issue(gh, ref)
    if issue.get("pull_request"):
        raise TriageError(f"{ref} is a pull request; only issues get the label", gate="pull_request")
    if issue.get("state") != "open":
        raise TriageError(f"{ref} is closed; closed issues are never labeled", gate="closed")
    url = issue.get("html_url")
    if _has_label(issue):
        return {"ok": True, "action": "none", "reason": "already_labeled", "ref": str(ref), "url": url}
    if dry_run or gh.eval_mode:
        result = {"ok": True, "action": "would_label", "ref": str(ref), "url": url, "label": LABEL}
        if gh.eval_mode:
            result["simulated"] = True
            log_path = os.environ.get(WRITE_LOG_ENV)
            if log_path and not dry_run:
                try:
                    with open(log_path, "a", encoding="utf-8") as log:
                        log.write(f"{ref}\n")
                except OSError as error:
                    raise TriageError(f"cannot write {WRITE_LOG_ENV} file '{log_path}': {error}") from error
        return result
    applied = gh.add_label(ref)
    if not any(_has_label({"labels": [item]}) for item in applied):
        raise TriageError(f"GitHub did not confirm the label on {ref}; not retried")
    return {"ok": True, "action": "labeled", "ref": str(ref), "url": url, "label": LABEL}


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise TriageError(message)


def build_parser() -> argparse.ArgumentParser:
    parser = _Parser(prog="triage.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True, parser_class=_Parser)
    context_parser = commands.add_parser("context", help="read the issue, its ancestors and its descendants")
    context_parser.add_argument("--issue", required=True, help="issue URL or owner/repo#N")
    label_parser = commands.add_parser("label", help=f"add `{LABEL}` to one open issue")
    label_parser.add_argument("--issue", required=True, help="issue URL or owner/repo#N")
    label_parser.add_argument("--dry-run", action="store_true", help="report what would be written, write nothing")
    return parser


def main(argv: Optional[list[str]] = None, gh: Optional[Gh] = None) -> int:
    try:
        args = build_parser().parse_args(argv)
        ref = parse_ref(args.issue)
        client = gh or Gh()
        if args.command == "context":
            result = context(client, ref)
        else:
            result = label(client, ref, dry_run=args.dry_run)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return EXIT_OK
    except TriageError as error:
        payload = {"ok": False, "error": str(error)}
        if error.gate:
            payload["gate"] = error.gate
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return error.exit_code


if __name__ == "__main__":
    sys.exit(main())
