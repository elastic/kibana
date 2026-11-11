#!/usr/bin/env python3
"""Simulated `gh api` for the evals. Used through TEST_PLAN_TRIAGE_GH; never talks to GitHub.

Serves GET requests for issues, sub-issues and comments from fixtures/issues.json
(STUB_FIXTURES overrides the path). Every other request fails, so a stray write
cannot succeed.
"""
import json
import os
import re
import sys
from pathlib import Path

FIXTURES = Path(os.environ.get("STUB_FIXTURES") or Path(__file__).resolve().parent / "fixtures" / "issues.json")
ISSUE_PATH = re.compile(r"^repos/([\w.-]+/[\w.-]+)/issues/(\d+)(/sub_issues|/comments)?(?:\?.*)?$")


def fail(message, code=1):
    print(message, file=sys.stderr)
    sys.exit(code)


def to_api(ref, data, fixtures):
    repo, number = ref.split("#")
    children = [key for key, value in fixtures.items() if value.get("parent") == ref]
    issue = {
        "number": int(number),
        "title": data["title"],
        "state": data.get("state", "open"),
        "body": data.get("body", ""),
        "html_url": f"https://github.com/{repo}/issues/{number}",
        "repository_url": f"https://api.github.com/repos/{repo}",
        "type": {"name": data["type"]} if data.get("type") else None,
        "labels": [{"name": name} for name in data.get("labels", [])],
        "sub_issues_summary": {"total": len(children)},
    }
    if data.get("parent"):
        parent_repo, parent_number = data["parent"].split("#")
        issue["parent_issue_url"] = f"https://api.github.com/repos/{parent_repo}/issues/{parent_number}"
    if data.get("pull_request"):
        issue["pull_request"] = {"url": f"https://api.github.com/repos/{repo}/pulls/{number}"}
    return issue


def main():
    args = sys.argv[1:]
    if not args or args[0] != "api" or "--method" in args or "-X" in args:
        fail("stub-gh: only `gh api` GET requests are simulated (read-only)")
    path = args[-1]
    match = ISSUE_PATH.match(path)
    if not match:
        fail(f"gh: Not Found (HTTP 404) {path}")
    fixtures = json.loads(FIXTURES.read_text(encoding="utf-8"))
    ref = f"{match.group(1).lower()}#{match.group(2)}"
    data = fixtures.get(ref)
    if data is None:
        fail("gh: Not Found (HTTP 404)")
    kind = match.group(3)
    if kind is None:
        print(json.dumps(to_api(ref, data, fixtures)))
    elif kind == "/sub_issues":
        children = sorted(
            (key for key, value in fixtures.items() if value.get("parent") == ref),
            key=lambda key: int(key.split("#")[1]),
        )
        print(json.dumps([[to_api(key, fixtures[key], fixtures) for key in children]]))
    else:
        comments = [
            {"user": {"login": comment.get("author", "someone")}, "created_at": "2026-10-01T10:00:00Z", "body": comment["body"]}
            for comment in data.get("comments", [])
        ]
        print(json.dumps([comments]))


if __name__ == "__main__":
    main()
