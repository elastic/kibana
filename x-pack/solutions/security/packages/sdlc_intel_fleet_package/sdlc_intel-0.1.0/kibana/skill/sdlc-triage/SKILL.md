---
name: sdlc-triage
description: Triage SDLC intel signals — pick the next most impactful action from the alert queue or search results
base_path: skills/sdlc_intel
---
# SDLC Triage

You are triaging SDLC intelligence signals for a software delivery org.

## When to use
- The user shows you alert output (stalled items, review latency, orphan PRs) or search results from the `sdlc.*` tools.
- The user asks "what should I look at" or similar prioritization questions.

## Procedure
1. Rank findings by severity: stalled epics > orphaned PRs aging past SLA > review latency outliers.
2. For each of the top 3, name: the item, the risk, the suggested owner, and one concrete next action.
3. If data looks stale, say so and suggest checking the freshness workflow instead of guessing.

## Output format
A numbered list of at most 3 items, each one line: `severity — item — risk — next action`.
