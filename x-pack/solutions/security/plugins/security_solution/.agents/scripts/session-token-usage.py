#!/usr/bin/env python3
"""
Reads the Claude Code session transcript and prints token usage totals.

Output (on success):
    input=N output=N cache_create=N cache_read=N total=N

With --with-cost, prints the estimated list-price cost on a second line, taken
from the same read of the transcript:
    input=N output=N cache_create=N cache_read=N total=N
    usd=N.NNNN pricing=YYYY-MM-DD
The second line is left out when any model in the session has no price, or
when the cost rounds to 0.0000. Usage with no model id is left out of the cost
(with a note on stderr) when, priced at the highest prices of the session's
models, it is at most 1% of the cost; above that, the cost is left out too.

Each API response is counted once: Claude Code repeats a response's usage on
every transcript line of that response, so lines sharing a message id are
merged. Totals cover the session up to the moment the script runs; Claude Code
usually writes the response that runs the script to the transcript only after
the command returns, so that response is usually not included.

Exit 0: transcript found, parsed, and contains at least one usage block; totals printed to stdout.
Exit 1: transcript not found, unreadable, or contains no usage blocks (not Claude Code,
        wrong harness, unrecognised format, or session ended before any exchange) —
        prints nothing; caller should write "not available".
Exit 2: --json manifest is invalid, or with --with-cost the prices could not be
        downloaded and the local copy is invalid (the token line is still printed).

Transcript location:
    ~/.claude/projects/<cwd-slug>/<session-id>.jsonl
    where <cwd-slug> = current working directory with '/' replaced by '-'
    and <session-id> = $CLAUDE_CODE_SESSION_ID environment variable.

Usage:
    python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py [TRANSCRIPT_PATH]
    python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py --with-cost [TRANSCRIPT_PATH]
    python3 x-pack/solutions/security/plugins/security_solution/.agents/scripts/session-token-usage.py
        --json [TRANSCRIPT_PATH] [--manifest MANIFEST] [--session-dir SESSION_DIR]

If TRANSCRIPT_PATH is given it overrides the auto-resolved location.
Structured mode emits versioned JSON and uses explicit unavailable statuses for
missing transcripts, manifests, payload counters, and artifacts.

The cost uses the Anthropic prices in gh-aw's models.json, downloaded from its
main branch on every run (the pricing date is then today). If the download
fails or the file is invalid, it uses model_prices.json, a copy of those prices
with its own pricing date. Set MODEL_PRICES_URL to read the prices from another
URL, or to an empty string to use only the copy. The formula follows gh-aw's
computeInferenceCostUSD: exact model id, else longest matching prefix; input
tokens do not include cache reads; 1-hour cache writes are billed at 2x the
input price.

Consumers:
- `exploratory-tester`: invoked from Phase 3 (Step 3a) while building the Timing & Cost section.
- `test-plan-generator`: invoked from Step 3 sub-step 7 (generate) and mode-update.md Step 6 (update)
  while building the `<!-- tokens: … -->` and `<!-- cost: … -->` comment markers and the chat
  "Token usage:" and "Estimated cost:" lines.

Shared across both skills to avoid drift on transcript parsing and edge-case handling.
"""

import argparse
import os
import sys
from datetime import date
from pathlib import Path

from session_metrics import (
    MODEL_PRICES_URL,
    PriceCatalog,
    build_session_metrics,
    estimate_session_cost,
    fetch_price_catalog,
    format_cost,
    format_legacy_usage,
    load_price_catalog,
    parse_transcript,
    render_json_metrics,
    resolve_transcript,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("transcript_path", nargs="?")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--json", action="store_true", dest="structured")
    mode.add_argument("--with-cost", action="store_true")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--session-dir", type=Path)
    return parser.parse_args()


def resolve_price_catalog() -> PriceCatalog:
    """Return today's gh-aw prices, or the local copy when they cannot be read."""
    url = os.environ.get("MODEL_PRICES_URL", MODEL_PRICES_URL)
    if not url:
        return load_price_catalog()
    try:
        return fetch_price_catalog(url, date.today().isoformat())
    except ValueError as exc:
        try:
            catalog = load_price_catalog()
        except ValueError as copy_exc:
            raise ValueError(f"{exc}; {copy_exc}") from copy_exc
        print(f"{exc}; using the local copy.", file=sys.stderr)
        return catalog


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
    if not args.with_cost:
        return 0

    try:
        catalog = resolve_price_catalog()
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    cost = estimate_session_cost(result.usage_by_model, catalog)
    if cost.usd is None:
        print(f"{cost.unavailable_reason}; cost left out.", file=sys.stderr)
        return 0
    if cost.model_less_tokens_left_out:
        print(
            f"Left {cost.model_less_tokens_left_out} tokens with no model id out of the cost.",
            file=sys.stderr,
        )
    cost_line = format_cost(cost.usd, catalog)
    if cost_line is None:
        print("Cost rounds to zero; cost left out.", file=sys.stderr)
        return 0
    print(cost_line)
    return 0


if __name__ == '__main__':
    sys.exit(main())
