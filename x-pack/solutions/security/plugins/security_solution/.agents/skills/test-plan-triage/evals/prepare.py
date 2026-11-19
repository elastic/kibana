#!/usr/bin/env python3
"""Build an isolated eval workspace for test-plan-triage.

  prepare.py --out DIR --models claude=<model id>,gpt=<model id>,gemini=<model id>
             [--baseline-reps 1] [--scenarios s1-...,s4-...] [--baseline-scenarios s16-...] [--note TEXT]

DIR gets:
  skill/      a copy of the skill without evals/, so agents cannot read the expected outcomes
  harness/    stub-gh.py and fixtures/; agents run the stub but never read it
  briefs/     agent-brief.md rendered once per config, with $SKILL, $STUB and $TRIAGE filled in
  scenarios/  the scenario files
  runs/<model>/<with|without>/<scenario>/r<N>/   one empty $WORK per run
  round.json  the date, git commit, models, settings and run list of the round

Prints one tab-separated line per run: model, config, scenario, rep, brief, scenario file, work dir.
Reps per scenario come from expected.json for runs with the skill, and from --baseline-reps without.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

EVALS = Path(__file__).resolve().parent
SKILL_SOURCE = EVALS.parent
CONFIGS = ("with", "without")
BLOCK_RE = re.compile(r"<!-- (with|without) -->\n(.*?)<!-- end -->\n", re.DOTALL)
PROMPT = (
    "Read the file {brief} and follow it exactly. In it, $SCENARIO = {scenario} and $WORK = {work}.\n"
    "Do not open any other file under {harness} (you only execute stub-gh.py). Do not modify files outside $WORK.\n"
    "When $WORK/answer.md is written, reply with only its RESULT block."
)


def render_brief(template: str, config: str) -> str:
    """Keep the blocks for `config`, drop the others."""
    return BLOCK_RE.sub(lambda match: match.group(2) if match.group(1) == config else "", template)


def git(*args: str) -> str:
    completed = subprocess.run(["git", *args], cwd=EVALS, capture_output=True, text=True, check=False)
    return completed.stdout.strip()


def parse_list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_models(value: str) -> dict[str, str]:
    models = {}
    for item in parse_list(value):
        label, _, model_id = item.partition("=")
        models[label.strip()] = model_id.strip() or label.strip()
    return models


def build(out: Path, models: dict[str, str], baseline_reps: int, only: dict[str, list[str]], note: str) -> list[tuple[str, ...]]:
    expected = json.loads((EVALS / "expected.json").read_text(encoding="utf-8"))
    unknown = sorted(set(only["with"] + only["without"]) - set(expected))
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
    template = (EVALS / "agent-brief.md").read_text(encoding="utf-8")
    template = template.replace("$STUB", str(harness / "stub-gh.py"))
    template = template.replace("$TRIAGE", str(skill / "scripts" / "triage.py"))
    template = template.replace("$SKILL", str(skill))
    for config in CONFIGS:
        (briefs / f"agent-brief-{config}.md").write_text(render_brief(template, config), encoding="utf-8")

    runs = []
    for model in models:
        for config in CONFIGS:
            for scenario in (name for name in expected if not only[config] or name in only[config]):
                reps = expected[scenario]["reps"] if config == "with" else baseline_reps
                for rep in range(1, reps + 1):
                    work = out / "runs" / model / config / scenario / f"r{rep}"
                    work.mkdir(parents=True)
                    brief = briefs / f"agent-brief-{config}.md"
                    runs.append((model, config, scenario, f"r{rep}", str(brief), str(out / "scenarios" / f"{scenario}.txt"), str(work)))

    round_info = {
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "git_commit": git("rev-parse", "HEAD"),
        "uncommitted_changes": bool(git("status", "--porcelain", "--", str(SKILL_SOURCE))),
        "models": models,
        "baseline_reps": baseline_reps,
        "scenarios": {config: only[config] or "all" for config in CONFIGS},
        "prompt": PROMPT,
        "note": note,
        "runs": len(runs),
    }
    (out / "round.json").write_text(json.dumps(round_info, indent=2) + "\n", encoding="utf-8")
    return runs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--models", required=True, help="comma-separated label=model id, one per model family")
    parser.add_argument("--baseline-reps", type=int, default=1)
    parser.add_argument("--scenarios", default="", help="comma-separated subset for runs with the skill; default all")
    parser.add_argument("--baseline-scenarios", default="", help="comma-separated subset for runs without the skill; default all")
    parser.add_argument("--note", default="", help="settings or anything else worth recording in round.json")
    args = parser.parse_args()
    out = args.out.resolve()
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f"{out} is not empty; pick a new directory")
    out.mkdir(parents=True, exist_ok=True)
    only = {"with": parse_list(args.scenarios), "without": parse_list(args.baseline_scenarios)}
    for run in build(out, parse_models(args.models), args.baseline_reps, only, args.note):
        print("\t".join(run))
    return 0


if __name__ == "__main__":
    sys.exit(main())
