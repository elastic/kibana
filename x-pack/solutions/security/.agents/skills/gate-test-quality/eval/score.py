#!/usr/bin/env python3
"""Score gate-test-quality blind-agent eval runs against GROUND_TRUTH.md.

Usage: python3 score.py <verdicts.json>
  verdicts.json: [{"run": 1, "model": "...", "found_defect_step": "...",
                   "defect_approval_missing": true, "vacuous_assertions_identified": true,
                   "false_positive_steps": [...]}]
Prints per-run PASS/FAIL and the aggregate pass rate; exit 0 if all runs pass.
"""
import json
import re
import sys
import pathlib

EXPECTED_STEP = "apply_disable_tuning"
HEALTHY_STEPS = {
    "apply_query_tuning",
    "apply_exception_tuning",
    "apply_suppression_tuning",
    "apply_risk_score_tuning",
}


def score_run(v: dict) -> tuple[bool, list[str]]:
    errs = []
    step = (v.get("found_defect_step") or "").strip().lower()
    if EXPECTED_STEP not in step:
        errs.append(f"defect step mismatch: got {v.get('found_defect_step')!r}, want *{EXPECTED_STEP}*")
    if not v.get("defect_approval_missing"):
        errs.append("approval-clause absence not identified")
    if not v.get("vacuous_assertions_identified"):
        errs.append("no vacuous assertion identified")
    fp = [s for s in (v.get("false_positive_steps") or []) if str(s).strip().lower() in HEALTHY_STEPS]
    if fp:
        errs.append(f"false positive(s) on healthy gates: {fp}")
    return (not errs), errs


def main() -> int:
    raw = pathlib.Path(sys.argv[1]).read_text().strip()
    verdicts = json.loads(raw) if raw else []
    passes = 0
    for v in verdicts:
        ok, errs = score_run(v)
        passes += ok
        status = "PASS" if ok else "FAIL"
        print(f"run {v.get('run', '?')} [{v.get('model', '?')}]: {status}")
        for e in errs:
            print(f"    - {e}")
    n = len(verdicts)
    print(f"\naggregate: {passes}/{n} pass ({passes / n:.0%})" if n else "no runs")
    return 0 if passes == n and n > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
