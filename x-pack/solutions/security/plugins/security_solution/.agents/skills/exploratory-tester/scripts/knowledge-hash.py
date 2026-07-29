#!/usr/bin/env python3
"""Compute and verify SHA-256 hashes for exploratory-tester knowledge files.

Knowledge-file approval (see `phases/0-setup.md` Step 0f) is hash-gated: a
user's yes/no confirmation is only reusable across a session resume, or
between the orchestrator and a dispatched sub-agent, while the file's
content is byte-identical to what was actually reviewed. Any edit
invalidates the stored approval and requires the file to be re-displayed
and re-approved.

Usage:
    python3 knowledge-hash.py --file <path>
        Prints `{"exists": bool, "sha256": str|null, "sections": [str, ...]}`
        for the file at <path>. `sections` is the ordered list of top-level
        (`## `) heading text found in the file — recorded alongside the
        hash so an approval's scope is auditable. Exit code is always 0
        for this form; a missing file is reported in the JSON, not via
        a non-zero exit, so callers can branch on `exists` in one parse.

    python3 knowledge-hash.py --file <path> --verify <sha256>
        Same JSON output, but exits 1 if the file does not exist or its
        current hash does not equal <sha256> (exit 0 otherwise) — for a
        simple bash conditional without parsing JSON.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

SECTION_HEADING_RE = re.compile(r"^##[ \t]+(.+?)[ \t]*$", re.MULTILINE)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def list_sections(text: str) -> list[str]:
    """Return the ordered list of top-level (`## `) section headings in text.

    Only `##` headings are considered "sections" for approval-recording
    purposes — `#` is the document title and `###`+ are subsections within
    a section, not independently suppression-relevant.
    """
    return [match.group(1).strip() for match in SECTION_HEADING_RE.finditer(text)]


def hash_file(path: Path) -> dict:
    if not path.is_file():
        return {"exists": False, "sha256": None, "sections": []}
    text = path.read_text(encoding="utf-8")
    return {
        "exists": True,
        "sha256": sha256_text(text),
        "sections": list_sections(text),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--file", required=True, help="Path to the knowledge markdown file"
    )
    parser.add_argument(
        "--verify",
        metavar="SHA256",
        help="Exit 1 unless the file exists and its hash equals this value",
    )
    args = parser.parse_args(argv)

    result = hash_file(Path(args.file))
    print(json.dumps(result))

    if args.verify is not None:
        if not result["exists"] or result["sha256"] != args.verify:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
