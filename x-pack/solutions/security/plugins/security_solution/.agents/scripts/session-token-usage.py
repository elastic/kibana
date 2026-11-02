#!/usr/bin/env python3
"""
Reads the Claude Code session transcript and prints token usage totals.

Output (on success):
    input=N output=N cache_create=N cache_read=N total=N

Exit 0: transcript found, parsed, and contains at least one usage block; totals printed to stdout.
Exit 1: transcript not found, unreadable, or contains no usage blocks (not Claude Code,
        wrong harness, unrecognised format, or session ended before any exchange) —
        prints nothing; caller should write "not available".

Transcript location:
    ~/.claude/projects/<cwd-slug>/<session-id>.jsonl
    where <cwd-slug> = current working directory with '/' replaced by '-'
    and <session-id> = $CLAUDE_CODE_SESSION_ID environment variable.

Usage:
    python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py [TRANSCRIPT_PATH]
    python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py
        --json [TRANSCRIPT_PATH] [--manifest MANIFEST] [--session-dir SESSION_DIR]

If TRANSCRIPT_PATH is given it overrides the auto-resolved location.
Structured mode emits versioned JSON and uses explicit unavailable statuses for
missing transcripts, manifests, payload counters, and artifacts.

Consumers:
- `exploratory-tester`: invoked from Phase 3 (Step 3a) while building the Timing & Cost section.
- `test-plan-generator`: invoked from Step 3 sub-step 7 (generate) and mode-update.md Step 6 (update)
  while building the `<!-- tokens: … -->` comment marker and the chat "Token usage:" line.

Shared across both skills to avoid drift on transcript parsing and edge-case handling.
"""

import argparse
import sys
from pathlib import Path

from session_metrics import (
    build_session_metrics,
    format_legacy_usage,
    parse_transcript,
    render_json_metrics,
    resolve_transcript,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("transcript_path", nargs="?")
    parser.add_argument("--json", action="store_true", dest="structured")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--session-dir", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.structured:
        try:
            metrics = build_session_metrics(
                args.manifest,
                Path(args.transcript_path) if args.transcript_path else None,
                args.session_dir,
            )
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 2
        print(render_json_metrics(metrics))
        return 0

    explicit_path = args.transcript_path
    transcript = resolve_transcript(explicit_path)

    if transcript is None:
        # Not Claude Code or transcript missing — caller writes "not available"
        return 1

    result = parse_transcript(transcript)
    if result.status != "available" or result.totals is None:
        return 1

    print(format_legacy_usage(result.totals))
    return 0


if __name__ == '__main__':
    sys.exit(main())
