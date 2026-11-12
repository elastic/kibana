#!/usr/bin/env python3
"""Build an isolated eval workspace for test-plan-triage.

  prepare.py --out DIR --models claude,gpt,gemini [--baseline-reps 1] [--scenarios s1-...,s4-...]

DIR gets:
  skill/      a copy of the skill without evals/, so agents cannot read the expected outcomes
  harness/    stub-gh.py and fixtures/; agents run the stub but never read it
  briefs/     agent-brief.md and agent-brief-baseline.md with $SKILL, $STUB and $TRIAGE filled in
  scenarios/  the scenario files
  runs/<model>/<with|without>/<scenario>/r<N>/   one empty $WORK per run

Prints one tab-separated line per run: model, config, scenario, rep, brief, scenario file, work dir.
Reps per scenario come from expected.json for runs with the skill, and from --baseline-reps without.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

EVALS = Path(__file__).resolve().parent
SKILL_SOURCE = EVALS.parent
BRIEFS = {"with": "agent-brief.md", "without": "agent-brief-baseline.md"}


def build(out: Path, models: list[str], baseline_reps: int, only: list[str]) -> list[tuple[str, ...]]:
    expected = json.loads((EVALS / "expected.json").read_text(encoding="utf-8"))
    scenarios = [name for name in expected if not only or name in only]
    unknown = sorted(set(only) - set(expected))
    if unknown:
        raise SystemExit(f"unknown scenarios: {', '.join(unknown)}")

    skill = out / "skill"
    shutil.copytree(SKILL_SOURCE, skill, ignore=shutil.ignore_patterns("evals", "__pycache__", "test_*.py"))
    harness = out / "harness"
    harness.mkdir()
    shutil.copy2(EVALS / "stub-gh.py", harness / "stub-gh.py")
    shutil.copytree(EVALS / "fixtures", harness / "fixtures")
    shutil.copytree(EVALS / "scenarios", out / "scenarios")

    briefs = out / "briefs"
    briefs.mkdir()
    for name in BRIEFS.values():
        text = (EVALS / name).read_text(encoding="utf-8")
        text = text.replace("$STUB", str(harness / "stub-gh.py"))
        text = text.replace("$TRIAGE", str(skill / "scripts" / "triage.py"))
        text = text.replace("$SKILL", str(skill))
        (briefs / name).write_text(text, encoding="utf-8")

    runs = []
    for model in models:
        for config, brief in BRIEFS.items():
            for scenario in scenarios:
                reps = expected[scenario]["reps"] if config == "with" else baseline_reps
                for rep in range(1, reps + 1):
                    work = out / "runs" / model / config / scenario / f"r{rep}"
                    work.mkdir(parents=True)
                    runs.append((model, config, scenario, f"r{rep}", str(briefs / brief), str(out / "scenarios" / f"{scenario}.txt"), str(work)))
    return runs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--models", required=True, help="comma-separated labels, one per model family")
    parser.add_argument("--baseline-reps", type=int, default=1)
    parser.add_argument("--scenarios", default="", help="comma-separated subset; default all")
    args = parser.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f"{out} is not empty; pick a new directory")
    out.mkdir(parents=True, exist_ok=True)
    models = [model.strip() for model in args.models.split(",") if model.strip()]
    only = [name.strip() for name in args.scenarios.split(",") if name.strip()]
    for run in build(out, models, args.baseline_reps, only):
        print("\t".join(run))
    return 0


if __name__ == "__main__":
    sys.exit(main())
