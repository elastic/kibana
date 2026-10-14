#!/usr/bin/env python3
"""Render `report.md` deterministically from parsed findings + config.json.

This is the renderer half of Task 7 ("Make report bookkeeping deterministic,
without losing Markdown evidence"). It consumes the JSONL sidecar produced
by `parse-findings.py` plus `config.json`, and emits the full report skeleton
described by `templates/report-format.md`: header metadata, the Timing & Cost
table, Summary counts, Level 1/2/3 finding sections (in full finding format,
per `templates/finding-format.md`), Skipped, Recommended Follow-up, and Known
/ Suppressed.

What stays deterministic (computed here, not asked of the model):
  - Grouping duplicate findings across flows by structured signature (see
    `parse-findings.py`), and merging their evidence — the UNION of every
    occurrence's evidence bullets, not just the first occurrence's, so
    Markdown evidence recorded by a non-canonical occurrence is never
    dropped — plus an "Also seen in flows: N, M" line naming every flow
    the group appeared in (not just "2+").
  - Per-flow Started/Duration and the Over? flag, from each flow's parsed
    header and `config.json -> flows[N].timeout_minutes`.
  - Session-total duration, from `config.json -> session_started_at` and
    `--now` (defaults to the current time; pass an explicit ISO timestamp
    for reproducible tests).
  - Coverage counts (Level 1/2/3, flows completed vs not) and the report
    skeleton itself.

What stays a model judgment call, passed in via `--overrides` (a single
JSON file; see below) rather than inferred:
  - `flow_status`: why a flow shows "not started" / "blocked" /
    "cap reached" / "timed out" rather than "completed" — both the status
    and its required `reason` are rendered in the Timing & Cost table's
    Status cell (`<status> — <reason>`), never silently collected and
    dropped. A flow with parsed timing data defaults to "completed" even
    when it ran over its budget — "over budget" and "timed out" are not the
    same thing (a flow can run long and still complete all 5 checklist
    steps; only the model knows whether steps were actually skipped). A
    flow with no findings file defaults to "not started" unless overridden.
  - `skipped_steps`: which checklist steps within a flow were skipped
    (populates the "Skipped" table) — the script has no way to know this
    from data alone.
  - `suppressions`: which findings match `## Known non-bugs` / known open
    bugs (Step 3b's own untrusted-content-handling judgment stays with the
    model; this script only mechanically moves an already-decided
    suppression into the "Known / Suppressed" table and recomputes counts).
    Suppressing a Level 1 finding is a hard error — Level 1 findings are
    never suppressed, even if an unrelated Level 2/3 finding happens to
    share its exact title (matched by signature, not by title text, once a
    title is confirmed safe to suppress).

`--overrides` schema (all keys optional):
{
  "flow_status": {"<flow_number>": {"status": "blocked", "reason": "..."}},
  "skipped_steps": [{"flow": "<flow name>", "checklist_step": "2 - ...",
                      "reason": "..."}],
  "suppressions": [{"title": "<exact finding title>", "reason": "..."}],
  "session_cap_note": "raised from 90 min mid-session - ..."
}

Usage:
    python3 render-report.py --session-dir <path> [--overrides <path>] \\
        [--now <ISO>] [--token-usage-line <text>] \\
        [--payload-bytes-line <text>] [--artifact-bytes-line <text>]

Prints a one-line JSON summary to stdout (level1_count, level2_count,
level3_count, suppressed_count, total_duration_human,
all_flows_completed_or_timed_out) for Step 3c to build the chat headline
from, without re-parsing report.md.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATUS_NOT_STARTED = "not started"
STATUS_COMPLETED = "completed"
STATUS_SESSION_LOST = "session lost"
# Statuses for which "completed or timed out" (the Step 3c headline gate)
# is considered satisfied.
HEADLINE_OK_STATUSES = {STATUS_COMPLETED, "timed out"}


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    records = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            records.append(json.loads(line))
    return records


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def format_duration(total_seconds: float, *, omit_zero_hours: bool = False) -> str:
    total_seconds = max(0, int(round(total_seconds)))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f"{hours}h {minutes}m"
    if omit_zero_hours:
        return f"{minutes}m"
    return f"0h {minutes}m"


def group_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group findings by structured signature, merging evidence.

    The canonical record for a group is its lowest-flow-number occurrence
    (prose fields — title/current_behavior/expected_behavior/why_issue —
    come from that occurrence). Evidence is the union of every occurrence's
    evidence bullets, in first-seen order, deduplicated by exact text, so a
    bullet recorded only by a later (non-canonical) occurrence is never
    lost. A trailing "Also seen in flows: N, M" line is appended when the
    group spans more than one flow.
    """
    groups: dict[str, list[dict[str, Any]]] = {}
    order: list[str] = []
    for finding in findings:
        signature = finding["signature"]
        if signature not in groups:
            groups[signature] = []
            order.append(signature)
        groups[signature].append(finding)

    merged: list[dict[str, Any]] = []
    for signature in order:
        occurrences = sorted(groups[signature], key=lambda f: f["flow_number"])
        canonical = dict(occurrences[0])
        evidence: list[str] = []
        for occurrence in occurrences:
            for line in occurrence["evidence"]:
                if line not in evidence:
                    evidence.append(line)
        flow_numbers = sorted({occurrence["flow_number"] for occurrence in occurrences})
        if len(flow_numbers) > 1:
            others = ", ".join(str(number) for number in flow_numbers)
            evidence.append(f"Also seen in flows: {others}")
        canonical["evidence"] = evidence
        canonical["flow_numbers"] = flow_numbers
        merged.append(canonical)
    return merged


def compute_flow_rows(
    *,
    flows: list[dict[str, Any]],
    flow_headers: dict[int, dict[str, Any]],
    flow_status_overrides: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    rows = []
    for flow_number, flow in enumerate(flows, start=1):
        header = flow_headers.get(flow_number)
        timeout_minutes = flow.get("timeout_minutes")
        override = flow_status_overrides.get(str(flow_number))
        source = flow.get("source", "specified")
        if source == "investigation" and flow.get("triggered_by"):
            source_display = f"investigation (\u21b3 {flow['triggered_by']})"
        else:
            source_display = source

        if header:
            duration_seconds = header.get("duration_seconds")
            status_override = header.get("status_override")
            reason = None
            # Explicit signals (a marker written deliberately in the file,
            # or a decision passed via --overrides) always take priority
            # over the "skipped: session lost" text heuristic below — a
            # model that already recorded a specific status/reason knows
            # more than a substring match over its own prose does.
            if status_override:
                status = status_override["status"]
                reason = status_override.get("reason")
            elif override:
                status = override["status"]
                reason = override.get("reason")
            elif header.get("session_lost"):
                status = STATUS_SESSION_LOST
            else:
                status = STATUS_COMPLETED
            over = None
            if duration_seconds is not None and timeout_minutes is not None:
                over = duration_seconds > timeout_minutes * 60
            rows.append(
                {
                    "flow_number": flow_number,
                    "name": flow.get("name", f"Flow {flow_number}"),
                    "source": source_display,
                    "started": header.get("started"),
                    "duration_raw": header.get("duration_raw"),
                    "timeout_minutes": timeout_minutes,
                    "over": over,
                    "status": status,
                    "reason": reason,
                }
            )
        else:
            status = override["status"] if override else STATUS_NOT_STARTED
            reason = override.get("reason") if override else None
            rows.append(
                {
                    "flow_number": flow_number,
                    "name": flow.get("name", f"Flow {flow_number}"),
                    "source": source_display,
                    "started": None,
                    "duration_raw": None,
                    "timeout_minutes": timeout_minutes,
                    "over": None,
                    "status": status,
                    "reason": reason,
                }
            )
    return rows


def status_display(row: dict[str, Any]) -> str:
    """Status text for display, with the override/marker reason appended.

    A `flow_status` override or `<!-- status: ... -->` marker is required to
    carry a reason (see `templates/finding-format.md` and the `--overrides`
    schema above) — surface it here rather than parsing and then discarding
    it, so "blocked" alone in the report doesn't leave the reader to guess
    why.
    """
    if row.get("reason"):
        return f"{row['status']} \u2014 {row['reason']}"
    return row["status"]


def render_evidence_block(evidence: list[str]) -> str:
    if not evidence:
        return "- _No evidence recorded._"
    return "\n".join(f"- {line}" for line in evidence)


def render_full_finding(finding: dict[str, Any]) -> str:
    block_type = finding.get("block_type", "Finding")
    lines = [f"### {block_type}: {finding['title']}", ""]
    lines.append(f"**Level:** {finding['level']}")
    if finding.get("flow_name"):
        lines.append(f"**Flow:** {finding['flow_name']}")
    if finding.get("role"):
        lines.append(f"**Role:** {finding['role']}")
    if finding.get("checklist_step_raw"):
        lines.append(f"**Checklist step:** {finding['checklist_step_raw']}")
    lines.append("")

    steps_followed = finding.get("steps_followed") or []
    if steps_followed:
        lines.append("**Steps followed:**")
        lines.extend(f"{index}. {step}" for index, step in enumerate(steps_followed, 1))
        lines.append("")

    lines.append(f"**Current behavior:** {finding['current_behavior']}")
    lines.append("")
    if finding.get("expected_behavior"):
        lines.append(f"**Expected behavior:** {finding['expected_behavior']}")
        lines.append("")
    if finding.get("why_issue"):
        lines.append(f"**Why this might be an issue:** {finding['why_issue']}")
        lines.append("")

    lines.append("**Evidence:**")
    lines.append(render_evidence_block(finding.get("evidence") or []))
    return "\n".join(lines)


def render_short_observation(finding: dict[str, Any]) -> str:
    lines = [f"### Observation: {finding['title']}", ""]
    lines.append(f"**Level:** {finding['level']}")
    if finding.get("flow_name"):
        lines.append(f"**Flow:** {finding['flow_name']}")
    if finding.get("role"):
        lines.append(f"**Role:** {finding['role']}")
    if finding.get("checklist_step_raw"):
        lines.append(f"**Checklist step:** {finding['checklist_step_raw']}")
    lines.append("")
    lines.append(f"**Current behavior:** {finding['current_behavior']}")
    lines.append("")
    lines.append("**Evidence:**")
    lines.append(render_evidence_block(finding.get("evidence") or []))
    return "\n".join(lines)


def apply_suppressions(
    findings_by_level: dict[int, list[dict[str, Any]]],
    suppressions: list[dict[str, str]],
) -> tuple[dict[int, list[dict[str, Any]]], list[dict[str, str]]]:
    # Titles are a display convenience, not a unique identifier — nothing in
    # the schema forbids two genuinely different findings (different levels,
    # different evidence) from sharing a title (parse-findings.py's own
    # dedup signature deliberately does not treat title alone as identity).
    # A suppression instruction only carries a title (that's all Step 3b
    # sees in report.md), so match ALL findings sharing that title, and if
    # ANY of them is Level 1, refuse the suppression entirely rather than
    # guessing which one was meant — silently dropping one out of several
    # same-titled findings is exactly the failure this function exists to
    # prevent.
    by_title: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for level, findings in findings_by_level.items():
        for finding in findings:
            by_title.setdefault(finding["title"], []).append((level, finding))

    suppressed_rows: list[dict[str, str]] = []
    suppressed_signatures: set[str] = set()
    for suppression in suppressions:
        title = suppression["title"]
        matches = by_title.get(title)
        if not matches:
            raise ValueError(
                f"--overrides suppressions references unknown finding title: {title!r}"
            )
        level1_matches = [finding for level, finding in matches if level == 1]
        if level1_matches:
            raise ValueError(
                f"Refusing to suppress {title!r} — a Level 1 finding shares this "
                "exact title (confirmed bugs are never suppressed); give the "
                "findings distinct titles if this collision is unintentional, "
                "or drop this suppression if it was meant for the Level 1 one"
            )
        for _level, finding in matches:
            suppressed_signatures.add(finding["signature"])
        suppressed_rows.append({"title": title, "reason": suppression["reason"]})

    remaining = {
        level: [finding for finding in findings if finding["signature"] not in suppressed_signatures]
        for level, findings in findings_by_level.items()
    }
    return remaining, suppressed_rows


def render_report(
    *,
    config: dict[str, Any],
    findings_records: list[dict[str, Any]],
    now: datetime,
    overrides: dict[str, Any],
    token_usage_line: str,
    payload_bytes_line: str,
    artifact_bytes_line: str,
) -> tuple[str, dict[str, Any]]:
    flow_headers = {
        record["flow_number"]: record
        for record in findings_records
        if record["kind"] == "flow_header"
    }
    raw_findings = [record for record in findings_records if record["kind"] == "finding"]
    merged_findings = group_findings(raw_findings)

    findings_by_level: dict[int, list[dict[str, Any]]] = {1: [], 2: [], 3: []}
    for finding in merged_findings:
        findings_by_level[finding["level"]].append(finding)

    findings_by_level, suppressed_rows = apply_suppressions(
        findings_by_level, overrides.get("suppressions", [])
    )

    flows = config.get("flows", [])
    flow_rows = compute_flow_rows(
        flows=flows,
        flow_headers=flow_headers,
        flow_status_overrides=overrides.get("flow_status", {}),
    )

    environment = config.get("environment", {})
    resolved_role = config.get("setup", {}).get("resolved_role") or config.get("resolved_role")
    test_user = (
        config.get("test_users", {}).get("primary", {}).get("username")
        or config.get("test_user", {}).get("username")
        or config.get("test_user")
    )
    space_id = config.get("space_id") or environment.get("space_id", "exploratory-testing")

    if "session_started_at" not in config:
        raise ValueError("config.json is missing required key: session_started_at")
    session_started_at = parse_iso(config["session_started_at"])
    total_seconds = (now - session_started_at).total_seconds()
    session_timeout_minutes = config.get("session_timeout_minutes")
    session_over = (
        session_timeout_minutes is not None and total_seconds > session_timeout_minutes * 60
    )

    explored_count = sum(1 for row in flow_rows if row["started"] is not None)

    lines: list[str] = []
    lines.append("# Exploratory Testing Report")
    lines.append("")
    lines.append(
        "> **[EXPERIMENTAL]** This report was generated by the exploratory-tester "
        "skill, which is under active development. Review all findings "
        "independently before filing bugs or escalating. False positives are "
        "possible - confirm each Level 1/2 finding in the product before acting "
        "on it."
    )
    lines.append("")
    lines.append(f"**Area:** {config.get('area', '')}")
    lines.append(f"**Environment:** {environment.get('type', '')} at {environment.get('url', '')}")
    lines.append(f"**Space:** {space_id}")
    lines.append(f"**Role:** {resolved_role or ''}")
    lines.append(f"**User:** {test_user or ''}")
    lines.append(f"**Date:** {now.date().isoformat()}")
    lines.append(f"**Mode:** {config.get('mode', '')}")
    lines.append(f"**Flows explored:** {explored_count} of {len(flow_rows)}")
    lines.append(f"**Session started:** {config['session_started_at']}")
    lines.append(f"**Session duration:** {format_duration(total_seconds)}")
    cap_line = f"**Session cap:** {session_timeout_minutes} min"
    if overrides.get("session_cap_note"):
        cap_line += f" ({overrides['session_cap_note']})"
    lines.append(cap_line)
    lines.append("")
    lines.append("## Timing & Cost")
    lines.append("")
    lines.append("| Flow | Source | Started | Duration | Budget | Over? | Status |")
    lines.append("|---|---|---|---|---|---|---|")
    for row in flow_rows:
        over_symbol = "-" if row["over"] is None else ("\u26a0\ufe0f over" if row["over"] else "\u2713")
        budget = f"{row['timeout_minutes']}m" if row["timeout_minutes"] is not None else "-"
        lines.append(
            "| {name} | {source} | {started} | {duration} | {budget} | {over} | {status} |".format(
                name=row["name"],
                source=row["source"],
                started=row["started"] or "-",
                duration=row["duration_raw"] or "-",
                budget=budget,
                over=over_symbol,
                status=status_display(row),
            )
        )
    total_over_symbol = "\u26a0\ufe0f over cap" if session_over else "\u2713"
    cap_display = f"{session_timeout_minutes}m cap" if session_timeout_minutes is not None else "-"
    lines.append(
        f"| **Total session** | - | {config['session_started_at']} | "
        f"**{format_duration(total_seconds)}** | {cap_display} | {total_over_symbol} | - |"
    )
    lines.append("")
    lines.append(token_usage_line)
    lines.append(payload_bytes_line)
    lines.append(artifact_bytes_line)
    lines.append("")

    level1_count = len(findings_by_level[1])
    level2_count = len(findings_by_level[2])
    level3_count = len(findings_by_level[3])
    completed_rows = [row for row in flow_rows if row["status"] == STATUS_COMPLETED]
    incomplete_rows = [row for row in flow_rows if row["status"] != STATUS_COMPLETED]

    lines.append("## Summary")
    lines.append(f"- Level 1 (confirmed bugs): {level1_count}")
    lines.append(f"- Level 2 (suspicious - your review needed): {level2_count}")
    lines.append(f"- Level 3 (observations): {level3_count}")
    lines.append(f"- Known / suppressed: {len(suppressed_rows)}")
    lines.append(f"- **Flows completed:** {len(completed_rows)} of {len(flow_rows)}")
    if incomplete_rows:
        listed = "; ".join(f"{row['name']} ({status_display(row)})" for row in incomplete_rows)
        lines.append(f"- **Flows not fully completed:** {len(incomplete_rows)} - {listed}")
    else:
        lines.append("- **Flows not fully completed:** 0")
    lines.append("")

    lines.append("## Level 1 - Confirmed Bugs")
    lines.append("")
    if findings_by_level[1]:
        lines.append("\n\n---\n\n".join(render_full_finding(f) for f in findings_by_level[1]))
    else:
        lines.append("_No Level 1 findings this session._")
    lines.append("")

    lines.append("## Level 2 - Suspicious")
    lines.append("")
    if findings_by_level[2]:
        lines.append("\n\n---\n\n".join(render_full_finding(f) for f in findings_by_level[2]))
    else:
        lines.append("_No Level 2 findings this session._")
    lines.append("")

    lines.append("## Level 3 - Observations")
    lines.append("")
    if findings_by_level[3]:
        lines.append("\n\n---\n\n".join(render_short_observation(f) for f in findings_by_level[3]))
    else:
        lines.append("_No Level 3 observations this session._")
    lines.append("")

    lines.append("## Skipped")
    lines.append("| Flow | Checklist step | Reason |")
    lines.append("|---|---|---|")
    skipped_steps = overrides.get("skipped_steps", [])
    if skipped_steps:
        for entry in skipped_steps:
            lines.append(
                f"| {entry['flow']} | {entry['checklist_step']} | {entry['reason']} |"
            )
    lines.append("")

    lines.append("## Recommended Follow-up")
    lines.append(
        "Flows identified as needed but not executed this session. Address "
        "these before treating the area as fully covered."
    )
    lines.append("")
    deferred_flows = config.get("deferred_flows", [])
    if deferred_flows:
        lines.append("| Flow | Triggered by | Priority | Why not run |")
        lines.append("|---|---|---|---|")
        for entry in deferred_flows:
            lines.append(
                "| {name} | {triggered_by} | {priority} | {reason} |".format(
                    name=entry.get("name", ""),
                    triggered_by=entry.get("triggered_by", ""),
                    priority=entry.get("priority", ""),
                    reason=entry.get("reason_not_run", ""),
                )
            )
    else:
        lines.append("_No deferred flows - session covered everything identified._")
    lines.append("")

    lines.append("## Known / Suppressed")
    lines.append("| Finding | Reason suppressed |")
    lines.append("|---|---|")
    for row in suppressed_rows:
        lines.append(f"| {row['title']} | {row['reason']} |")
    lines.append("")

    report_text = "\n".join(lines)

    summary = {
        "level1_count": level1_count,
        "level2_count": level2_count,
        "level3_count": level3_count,
        "suppressed_count": len(suppressed_rows),
        "total_duration_human": format_duration(total_seconds, omit_zero_hours=True),
        "all_flows_completed_or_timed_out": all(
            row["status"] in HEADLINE_OK_STATUSES for row in flow_rows
        ),
    }
    return report_text, summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--session-dir", help="Session directory (config.json + findings.jsonl)")
    parser.add_argument("--config", help="Path to config.json (overrides --session-dir)")
    parser.add_argument(
        "--findings-jsonl", help="Path to findings.jsonl (overrides --session-dir)"
    )
    parser.add_argument("--out", help="Output report.md path (default: <session-dir>/report.md)")
    parser.add_argument(
        "--overrides", help="Path to the JSON overrides file (flow_status/skipped_steps/suppressions)"
    )
    parser.add_argument(
        "--now", help="ISO timestamp to use as 'now' (default: current UTC time; set for tests)"
    )
    parser.add_argument(
        "--token-usage-line",
        default="**Token usage:** not available",
        help="Pre-formatted token usage line (see phases/3-report.md)",
    )
    parser.add_argument(
        "--payload-bytes-line",
        default="**Browser/tool payload bytes:** not available",
        help="Pre-formatted payload bytes line",
    )
    parser.add_argument(
        "--artifact-bytes-line",
        default="**Session artifact bytes:** not available",
        help="Pre-formatted artifact bytes line",
    )
    args = parser.parse_args(argv)

    if args.config:
        config_path = Path(args.config)
    elif args.session_dir:
        config_path = Path(args.session_dir) / "config.json"
    else:
        parser.error("one of --session-dir or --config is required")
        return 2  # pragma: no cover

    if args.findings_jsonl:
        findings_path = Path(args.findings_jsonl)
    elif args.session_dir:
        findings_path = Path(args.session_dir) / "findings.jsonl"
    else:
        parser.error("one of --session-dir or --findings-jsonl is required")
        return 2  # pragma: no cover

    if args.out:
        out_path = Path(args.out)
    elif args.session_dir:
        out_path = Path(args.session_dir) / "report.md"
    else:
        parser.error("one of --session-dir or --out is required")
        return 2  # pragma: no cover

    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"error: config not found: {config_path}", file=sys.stderr)
        return 1

    if not findings_path.exists():
        print(
            f"error: findings JSONL not found: {findings_path} — run parse-findings.py "
            "first (a session with zero findings still needs an existing, "
            "possibly-empty, findings.jsonl)",
            file=sys.stderr,
        )
        return 1
    findings_records = load_jsonl(findings_path)

    if args.overrides:
        try:
            overrides = json.loads(Path(args.overrides).read_text(encoding="utf-8"))
        except FileNotFoundError:
            print(f"error: overrides file not found: {args.overrides}", file=sys.stderr)
            return 1
    else:
        overrides = {}
    now = parse_iso(args.now) if args.now else datetime.now(timezone.utc)

    try:
        report_text, summary = render_report(
            config=config,
            findings_records=findings_records,
            now=now,
            overrides=overrides,
            token_usage_line=args.token_usage_line,
            payload_bytes_line=args.payload_bytes_line,
            artifact_bytes_line=args.artifact_bytes_line,
        )
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    out_path.write_text(report_text + "\n", encoding="utf-8")
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
