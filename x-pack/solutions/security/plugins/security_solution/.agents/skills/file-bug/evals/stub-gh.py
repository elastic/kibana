#!/usr/bin/env python3
"""Simulated `gh search` / `gh label list` for the evals. Used through FILE_BUG_GH; never talks to GitHub.

STUB_MODE: empty (default) -> []; dup -> dup-matches.json for issues;
identifier -> mimics GitHub: an identifier ANDed with other words and no in:title/in:body
returns [], the bare identifier or a qualified query returns dup-identifier.json.
PR searches always return [].
"""
import json
import os
import sys
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures"
mode = os.environ.get("STUB_MODE", "empty")
args = sys.argv[1:]
kind = args[1] if len(args) > 1 and args[0] == "search" else ""
KNOWN_LABELS = {
    "bug",
    "triage_needed",
    "Team:Entity Analytics",
    "Team:Detection Engineering",
    "v9.3.0",
    "sec-eng-prod:exploratory-tester",
}
if args[:2] == ["label", "list"]:
    wanted = args[args.index("--search") + 1] if "--search" in args else ""
    print(json.dumps([{"name": wanted}] if wanted in KNOWN_LABELS else []))
    sys.exit(0)
query = args[-1] if args else ""


def load(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


result = []
if kind == "issues":
    if mode == "dup":
        result = load("dup-matches.json")
    elif mode == "identifier":
        issues = load("dup-identifier.json")
        qualified = "in:title" in query or "in:body" in query
        plain = query.replace("in:title", "").replace("in:body", "").strip().lower()
        token = "document_parsing_exception"
        text = " ".join(f"{i['title']} {i['body']}" for i in issues).lower()
        if token in plain:
            hit = plain == token or qualified
        else:
            hit = qualified and sum(word in text for word in plain.split()) >= 2
        result = issues if hit else []
print(json.dumps(result))
