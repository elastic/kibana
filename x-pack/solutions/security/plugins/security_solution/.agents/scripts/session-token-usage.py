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

If TRANSCRIPT_PATH is given it overrides the auto-resolved location.

Consumers:
- `exploratory-tester`: invoked from Phase 3 (Step 3a) while building the Timing & Cost section.
- `test-plan-generator`: invoked from Step 3 sub-step 7 (generate) and mode-update.md Step 6 (update)
  while building the `<!-- tokens: … -->` comment marker and the chat "Token usage:" line.

Shared across both skills to avoid drift on transcript parsing and edge-case handling.
"""

import sys
from session_metrics import format_legacy_usage, parse_transcript, resolve_transcript


def main():
    explicit_path = sys.argv[1] if len(sys.argv) > 1 else None
    transcript = resolve_transcript(explicit_path)

    if transcript is None:
        # Not Claude Code or transcript missing — caller writes "not available"
        sys.exit(1)

    result = parse_transcript(transcript)
    if result.status != "available" or result.totals is None:
        sys.exit(1)

    print(format_legacy_usage(result.totals))
    sys.exit(0)


if __name__ == '__main__':
    main()
