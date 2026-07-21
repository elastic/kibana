#!/usr/bin/env python3
"""
Reads the Claude Code session transcript and prints token usage totals.

Output (on success):
    input=N output=N cache_create=N cache_read=N total=N

Exit 0: transcript found and parsed; totals printed to stdout.
Exit 1: transcript not found or unreadable (not Claude Code, wrong harness, etc.)
        — prints nothing; caller should write "not available".

Transcript location:
    ~/.claude/projects/<cwd-slug>/<session-id>.jsonl
    where <cwd-slug> = current working directory with '/' replaced by '-'
    and <session-id> = $CLAUDE_CODE_SESSION_ID environment variable.

Usage:
    python3 scripts/session-token-usage.py [TRANSCRIPT_PATH]

If TRANSCRIPT_PATH is given it overrides the auto-resolved location.
Run this at the end of Phase 3 (Step 3a) while building the Timing & Cost section.
"""

import json
import os
import sys
from pathlib import Path


def resolve_transcript(explicit_path=None):
    """Return the path to the JSONL transcript, or None if not found."""
    if explicit_path:
        p = Path(explicit_path)
        return p if p.is_file() else None

    session_id = os.environ.get('CLAUDE_CODE_SESSION_ID', '').strip()
    if not session_id:
        return None

    # cwd slug: replace '/' with '-' (leading '/' becomes leading '-')
    cwd_slug = os.getcwd().replace('/', '-')
    transcript = Path.home() / '.claude' / 'projects' / cwd_slug / f'{session_id}.jsonl'
    if transcript.is_file():
        return transcript

    # Fallback: newest *.jsonl in the projects/<cwd-slug> directory
    project_dir = Path.home() / '.claude' / 'projects' / cwd_slug
    if project_dir.is_dir():
        candidates = sorted(project_dir.glob('*.jsonl'), key=lambda p: p.stat().st_mtime)
        if candidates:
            return candidates[-1]

    return None


def sum_tokens(transcript_path):
    """
    Sum token fields across all lines in the JSONL transcript.

    Each line may be a JSON object with a top-level 'usage' key (older format)
    or a 'message' key whose value has a 'usage' sub-key (newer format).
    Unrecognised or unparseable lines are silently skipped.
    """
    totals = {
        'input_tokens': 0,
        'output_tokens': 0,
        'cache_creation_input_tokens': 0,
        'cache_read_input_tokens': 0,
    }

    with open(transcript_path, encoding='utf-8') as fh:
        for raw in fh:
            raw = raw.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError:
                continue

            # Try 'message.usage' first (Claude Code ≥ 2025 format)
            usage = None
            msg = obj.get('message')
            if isinstance(msg, dict):
                usage = msg.get('usage')
            # Fall back to top-level 'usage'
            if not isinstance(usage, dict):
                usage = obj.get('usage')
            if not isinstance(usage, dict):
                continue

            for key in totals:
                v = usage.get(key, 0)
                if isinstance(v, (int, float)):
                    totals[key] += int(v)

    return totals


def main():
    explicit_path = sys.argv[1] if len(sys.argv) > 1 else None
    transcript = resolve_transcript(explicit_path)

    if transcript is None:
        # Not Claude Code or transcript missing — caller writes "not available"
        sys.exit(1)

    try:
        t = sum_tokens(transcript)
    except OSError:
        sys.exit(1)

    total = sum(t.values())
    print(
        f"input={t['input_tokens']} "
        f"output={t['output_tokens']} "
        f"cache_create={t['cache_creation_input_tokens']} "
        f"cache_read={t['cache_read_input_tokens']} "
        f"total={total}"
    )
    sys.exit(0)


if __name__ == '__main__':
    main()
