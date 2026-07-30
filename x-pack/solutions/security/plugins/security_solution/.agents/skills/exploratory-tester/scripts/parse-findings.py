#!/usr/bin/env python3
"""Parse `findings-flow-<N>.md` files into a deterministic JSONL sidecar.

This is the parser half of Task 7 ("Make report bookkeeping deterministic,
without losing Markdown evidence"). The Markdown findings files written by
the model during Phase 2 remain the human-auditable source of truth — this
script never rewrites them. It only *reads* them and emits a derived,
machine-readable sidecar (`findings.jsonl` by default) that `render-report.py`
consumes to build `report.md` deterministically.

Each output line is one JSON object, one of two kinds:

  {"kind": "flow_header", "flow_number": 1, "flow_name": "...",
   "started": "<ISO>", "ended": "<ISO>", "duration_raw": "12m 38s",
   "duration_seconds": 758, "session_lost": false,
   "status_override": {"status": "blocked", "reason": "..."} | null,
   "source_file": "findings-flow-1.md"}

  {"kind": "finding", "flow_number": 1, "flow_name": "...",
   "block_type": "Finding" | "Observation", "title": "...", "level": 1,
   "role": "...", "checklist_step_raw": "1 — Happy path",
   "checklist_step_number": 1, "steps_followed": ["...", ...],
   "current_behavior": "...", "expected_behavior": "..." | null,
   "why_issue": "..." | null, "evidence": ["...", ...],
   "signature": "<sha256 hex>", "source_file": "findings-flow-1.md",
   "finding_index": 0}

There is exactly one `flow_header` record per findings file (from its
`<!-- flow: ... -->` comment) and zero or more `finding` records (one per
`## Finding: ...` / `## Observation: ...` block).

## Structured dedup signature

The previous manual instruction deduplicated findings across flows by
grouping on "`type` + first 100 characters of `current_behavior`". That key
is fragile in both directions: two unrelated findings that happen to open
with similar phrasing collide, while the same underlying bug described with
slightly different wording (very common — the model writes fresh prose each
time) fails to collide at all.

`signature` instead hashes:
  - `level` (1/2/3) — different severities are never the same finding.
  - `checklist_step_number` (if present) — a strong hint two findings were
    produced by exercising the same numbered step.
  - a normalized form of the title.
  - normalized evidence lines — the *facts* of what was observed (HTTP
    method/path/status, console message shape, etc.), with session-specific
    noise masked out (query strings, timestamps, UUIDs, long hex ids,
    epoch-millisecond numbers, the `/s/<space>/` prefix) and pure artifact
    paths (Screenshot/Video — always session/flow-specific, carry no
    bug-identity signal) excluded entirely.

Evidence facts are a more precise fingerprint of "is this the same bug" than
free-form prose, and are far less sensitive to how the model happened to
phrase the surrounding narrative in a given flow.

Usage:
    python3 parse-findings.py --session-dir <path>
        Discovers findings-flow-*.md in <path>, writes <path>/findings.jsonl.

    python3 parse-findings.py --findings <file> [<file> ...] --out <path>
        Explicit file list and output path (used by tests).

Exits 1 (with a message on stderr) if a block is missing a `Level` field
with a valid value, or is missing `Current behavior` — those are the two
fields the rest of the pipeline cannot function without. A missing Evidence
section is a warning, not an error: the finding is never silently dropped.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

FLOW_HEADER_RE = re.compile(
    r"^<!--\s*flow:\s*(?P<name>.+?)\s*\|\s*started:\s*(?P<started>\S+)\s*\|\s*"
    r"ended:\s*(?P<ended>\S+)\s*\|\s*duration:\s*(?P<duration>.+?)\s*-->\s*$",
    re.MULTILINE,
)
STATUS_OVERRIDE_RE = re.compile(
    r"^<!--\s*status:\s*(?P<status>[a-z ]+?)\s*\|\s*reason:\s*(?P<reason>.+?)\s*-->\s*$",
    re.MULTILINE | re.IGNORECASE,
)
BLOCK_START_RE = re.compile(r"^##\s+(Finding|Observation):\s*(.+?)\s*$", re.MULTILINE)
FIELD_RE = re.compile(r"^\*\*(Level|Flow|Role|Checklist step):\*\*\s*(.*)$")
SUBHEADING_RE = re.compile(r"^###\s+(.+?)\s*$")
FLOW_NUMBER_RE = re.compile(r"findings-flow-(\d+)\.md$")
CHECKLIST_STEP_NUMBER_RE = re.compile(r"^(\d+)")
LIST_ITEM_RE = re.compile(r"^\d+\.\s*")

KNOWN_SUBHEADINGS = {
    "steps followed": "steps_followed",
    "current behavior": "current_behavior",
    "expected behavior": "expected_behavior",
    "why this might be an issue": "why_issue",
    "evidence": "evidence",
}

WHITESPACE_RE = re.compile(r"\s+")
PUNCT_RE = re.compile(r"[^\w\s]")
ISO_TIMESTAMP_RE = re.compile(r"\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(?:\.\d+)?z?")
UUID_RE = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b")
LONG_HEX_RE = re.compile(r"\b[0-9a-f]{12,64}\b")
LONG_NUMBER_RE = re.compile(r"\b\d{10,}\b")
QUERY_STRING_RE = re.compile(r"\?[^\s`\")]*")
SPACE_PATH_PREFIX_RE = re.compile(r"/s/[^/\s`]+/")
PATH_ONLY_EVIDENCE_RE = re.compile(r"^(screenshot|video)\s*:", re.IGNORECASE)
TRAILING_PARENTHETICAL_RE = re.compile(r"\s*\([^()]*\)\s*$")


def parse_flow_number(path: Path) -> int:
    match = FLOW_NUMBER_RE.search(path.name)
    if not match:
        raise ValueError(f"Cannot determine flow number from filename: {path.name}")
    return int(match.group(1))


def duration_to_seconds(duration: str) -> int | None:
    """Parse "Xh Ym", "Ym Zs", "Zs", "Xh Ym Zs" into total seconds."""
    pattern = re.compile(
        r"\s*(?:(?P<hours>\d+)h)?\s*(?:(?P<minutes>\d+)m)?\s*(?:(?P<seconds>\d+)s)?\s*"
    )
    match = pattern.fullmatch(duration.strip())
    if not match or not any(match.group(name) for name in ("hours", "minutes", "seconds")):
        return None
    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)
    return hours * 3600 + minutes * 60 + seconds


def normalize_text(text: str) -> str:
    text = text.strip().lower()
    text = PUNCT_RE.sub(" ", text)
    text = WHITESPACE_RE.sub(" ", text)
    return text.strip()


def _mask_dynamic_tokens(text: str) -> str:
    text = QUERY_STRING_RE.sub("", text)
    text = SPACE_PATH_PREFIX_RE.sub("/s/<space>/", text)
    text = ISO_TIMESTAMP_RE.sub("<timestamp>", text)
    text = UUID_RE.sub("<uuid>", text)
    text = LONG_HEX_RE.sub("<id>", text)
    text = LONG_NUMBER_RE.sub("<num>", text)
    return text


def normalize_evidence_line(line: str) -> str | None:
    """Normalize one evidence bullet into a signature fragment.

    Returns None for lines that are purely artifact-path references
    (Screenshot:/Video:) — those paths are always session/flow-specific and
    would otherwise force every occurrence of the same bug into its own
    dedup group.

    A trailing parenthetical remark (commonly free-form commentary like
    "(×3, lines 374/468/474 in request log)") is stripped before masking:
    the same underlying fact observed in two flows is often annotated with
    different incidental detail, and that detail should not stop the two
    occurrences from sharing a signature.
    """
    stripped = line.strip()
    if stripped.startswith("-"):
        stripped = stripped[1:].strip()
    if PATH_ONLY_EVIDENCE_RE.match(stripped):
        return None
    stripped = TRAILING_PARENTHETICAL_RE.sub("", stripped)
    return normalize_text(_mask_dynamic_tokens(stripped.lower()))


def compute_signature(
    *,
    level: int,
    checklist_step_number: int | None,
    title: str,
    evidence: list[str],
) -> str:
    evidence_keys = sorted(
        {key for line in evidence if (key := normalize_evidence_line(line)) is not None}
    )
    payload = {
        "level": level,
        "checklist_step_number": checklist_step_number,
        "title_key": normalize_text(title),
        "evidence_keys": evidence_keys,
    }
    canonical = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def split_blocks(text: str) -> list[tuple[str, str, str]]:
    """Return (block_type, title, block_text) for each Finding/Observation block."""
    matches = list(BLOCK_START_RE.finditer(text))
    blocks = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(1), match.group(2).strip(), text[start:end]))
    return blocks


def parse_block_fields(block_text: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in block_text.splitlines():
        match = FIELD_RE.match(line.strip())
        if match:
            key = match.group(1).lower().replace(" ", "_")
            fields[key] = match.group(2).strip()
    return fields


def parse_block_sections(block_text: str) -> dict[str, str]:
    """Split block text by ### headings into named sections, verbatim."""
    sections: dict[str, list[str]] = {}
    current_key: str | None = None
    for line in block_text.splitlines():
        heading_match = SUBHEADING_RE.match(line.strip())
        if heading_match:
            current_key = KNOWN_SUBHEADINGS.get(heading_match.group(1).strip().lower())
            if current_key:
                sections.setdefault(current_key, [])
            continue
        if line.strip() == "---":
            current_key = None
            continue
        if current_key:
            sections[current_key].append(line)
    return {key: "\n".join(value).strip() for key, value in sections.items()}


def _bullet_lines(raw: str) -> list[str]:
    return [
        line.strip()[1:].strip() if line.strip().startswith("-") else line.strip()
        for line in raw.splitlines()
        if line.strip()
    ]


def _numbered_lines(raw: str) -> list[str]:
    return [LIST_ITEM_RE.sub("", line.strip()) for line in raw.splitlines() if line.strip()]


def parse_findings_file(path: Path) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    text = path.read_text(encoding="utf-8")
    flow_number = parse_flow_number(path)

    header_match = FLOW_HEADER_RE.search(text)
    override_match = STATUS_OVERRIDE_RE.search(text)
    session_lost = "session lost" in text.lower()

    flow_header: dict[str, Any] | None = None
    default_flow_name: str | None = None
    if header_match:
        default_flow_name = header_match.group("name").strip()
        duration_raw = header_match.group("duration").strip()
        flow_header = {
            "kind": "flow_header",
            "flow_number": flow_number,
            "flow_name": default_flow_name,
            "started": header_match.group("started").strip(),
            "ended": header_match.group("ended").strip(),
            "duration_raw": duration_raw,
            "duration_seconds": duration_to_seconds(duration_raw),
            "session_lost": session_lost,
            "status_override": (
                {
                    "status": override_match.group("status").strip(),
                    "reason": override_match.group("reason").strip(),
                }
                if override_match
                else None
            ),
            "source_file": path.name,
        }

    findings: list[dict[str, Any]] = []
    for index, (block_type, title, block_text) in enumerate(split_blocks(text)):
        fields = parse_block_fields(block_text)
        sections = parse_block_sections(block_text)

        level_raw = fields.get("level")
        level: int | None
        try:
            level = int(level_raw) if level_raw is not None else None
        except ValueError:
            level = None
        if level not in (1, 2, 3):
            raise ValueError(
                f"{path.name}: block {index} ({title!r}) has a missing or invalid "
                f"Level (got {level_raw!r}) — every finding/observation must "
                "declare **Level:** 1, 2, or 3"
            )

        current_behavior = sections.get("current_behavior", "").strip()
        if not current_behavior:
            raise ValueError(
                f"{path.name}: block {index} ({title!r}) is missing a "
                "'### Current behavior' section"
            )

        evidence = _bullet_lines(sections.get("evidence", ""))
        if not evidence:
            print(
                f"warning: {path.name}: block {index} ({title!r}) has no "
                "Evidence bullets",
                file=sys.stderr,
            )

        checklist_step_raw = fields.get("checklist_step")
        checklist_step_number = None
        if checklist_step_raw:
            number_match = CHECKLIST_STEP_NUMBER_RE.match(checklist_step_raw.strip())
            if number_match:
                checklist_step_number = int(number_match.group(1))

        findings.append(
            {
                "kind": "finding",
                "flow_number": flow_number,
                "flow_name": fields.get("flow") or default_flow_name,
                "block_type": block_type,
                "title": title,
                "level": level,
                "role": fields.get("role"),
                "checklist_step_raw": checklist_step_raw,
                "checklist_step_number": checklist_step_number,
                "steps_followed": _numbered_lines(sections.get("steps_followed", "")),
                "current_behavior": current_behavior,
                "expected_behavior": sections.get("expected_behavior") or None,
                "why_issue": sections.get("why_issue") or None,
                "evidence": evidence,
                "signature": compute_signature(
                    level=level,
                    checklist_step_number=checklist_step_number,
                    title=title,
                    evidence=evidence,
                ),
                "source_file": path.name,
                "finding_index": index,
            }
        )

    if flow_header is None:
        raise ValueError(
            f"{path.name}: missing the required flow header comment "
            "(`<!-- flow: <name> | started: <ISO> | ended: <ISO> | "
            "duration: <Xm Ys> -->`)"
        )

    return flow_header, findings


def discover_findings_files(session_dir: Path) -> list[Path]:
    return sorted(session_dir.glob("findings-flow-*.md"), key=parse_flow_number)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--session-dir", help="Session directory containing findings-flow-*.md")
    parser.add_argument(
        "--findings",
        nargs="+",
        help="Explicit findings-flow-*.md paths (overrides --session-dir discovery)",
    )
    parser.add_argument(
        "--out",
        help="Output JSONL path (default: <session-dir>/findings.jsonl; stdout if neither "
        "--session-dir nor --out is set)",
    )
    args = parser.parse_args(argv)

    if args.findings:
        paths = [Path(item) for item in args.findings]
    elif args.session_dir:
        paths = discover_findings_files(Path(args.session_dir))
    else:
        parser.error("one of --session-dir or --findings is required")
        return 2  # pragma: no cover - argparse exits before this

    records: list[dict[str, Any]] = []
    try:
        for path in paths:
            flow_header, findings = parse_findings_file(path)
            if flow_header:
                records.append(flow_header)
            records.extend(findings)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    lines = "\n".join(json.dumps(record, sort_keys=True) for record in records)

    if args.out:
        out_path: Path | None = Path(args.out)
    elif args.session_dir:
        out_path = Path(args.session_dir) / "findings.jsonl"
    else:
        out_path = None

    if out_path is None:
        print(lines)
        return 0

    out_path.write_text(lines + ("\n" if lines else ""), encoding="utf-8")
    print(
        f"Parsed {len(paths)} findings file(s) -> {len(records)} record(s) written to {out_path}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
