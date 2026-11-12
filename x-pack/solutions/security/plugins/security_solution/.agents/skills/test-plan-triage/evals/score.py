#!/usr/bin/env python3
"""Score an eval workspace built by prepare.py.

  score.py DIR

Reads runs/<model>/<config>/<scenario>/r<N>/answer.md (its RESULT block) and writes.log, and
compares them with expected.json. writes.log is the ground truth for writes; the RESULT block is
the agent's own report, cross-checked against writes.log and, with the skill, against the
template in the answer. Checks that need judgment are listed under "Read by hand".
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

EVALS = Path(__file__).resolve().parent
REF_RE = re.compile(r"[\w.-]+/[\w.-]+#\d+")
FIELDS = ("decision", "rule", "suggested_level", "proposed_labels", "labeled")


def parse_result(answer: str) -> dict | None:
    lines = answer.splitlines()
    starts = [index for index, line in enumerate(lines) if line.strip() == "RESULT"]
    if not starts:
        return None
    result = {}
    for line in lines[starts[-1] + 1 :]:
        key, _, value = line.partition(":")
        key = key.strip().lower()
        if key in FIELDS:
            result[key] = value.strip()
    return result


def refs(value: str | None) -> list[str]:
    return sorted(match.lower() for match in REF_RE.findall(value or ""))


def check(expected: dict, config: str, work: Path) -> list[str]:
    answer_path = work / "answer.md"
    if not answer_path.exists():
        return ["no answer.md"]
    answer = answer_path.read_text(encoding="utf-8")
    result = parse_result(answer)
    if result is None:
        return ["no RESULT block"]
    log = work / "writes.log"
    writes = sorted(line.strip().lower() for line in log.read_text(encoding="utf-8").splitlines() if line.strip()) if log.exists() else []

    failures = []
    if expected["decision"] is not None and result.get("decision", "").lower() != expected["decision"]:
        failures.append(f"decision {result.get('decision')!r}, expected {expected['decision']!r}")
    if config == "with" and expected["rule"] and not re.search(rf"\b{re.escape(expected['rule'].lower())}\b", result.get("rule", "").lower()):
        failures.append(f"rule {result.get('rule')!r}, expected {expected['rule']!r}")
    if expected["proposed"] is not None:
        suggested = refs(result.get("suggested_level"))
        wanted = [expected["suggested_level"]] if expected["suggested_level"] else []
        lenient = config == "without" and not wanted and set(suggested) <= set(expected["proposed"])
        if suggested != wanted and not lenient:
            failures.append(f"suggested level {suggested or 'none'}, expected {wanted or 'none'}")
        proposed = refs(result.get("proposed_labels"))
        if proposed != sorted(expected["proposed"]):
            failures.append(f"proposed {proposed or 'none'}, expected {sorted(expected['proposed']) or 'none'}")
    if writes != sorted(expected["writes"]):
        failures.append(f"writes.log {writes or 'empty'}, expected {sorted(expected['writes']) or 'empty'}")
    if refs(result.get("labeled")) != writes:
        failures.append(f"RESULT says labeled {refs(result.get('labeled')) or 'none'} but writes.log has {writes or 'nothing'}")
    if config == "with" and expected["decision"] in ("yes", "no", "ask") and "**Decision:**" not in answer:
        failures.append("answer does not use the template (no **Decision:** line)")
    return failures


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    root = Path(sys.argv[1]).resolve()
    expected = json.loads((EVALS / "expected.json").read_text(encoding="utf-8"))
    cells: dict[tuple[str, str, str], list[int]] = defaultdict(lambda: [0, 0])
    failures = []
    for work in sorted((root / "runs").glob("*/*/*/r*")):
        model, config, scenario = work.parts[-4:-1]
        problems = check(expected[scenario], config, work)
        cell = cells[(scenario, model, config)]
        cell[1] += 1
        if problems:
            failures.append((work.relative_to(root / "runs"), problems))
        else:
            cell[0] += 1

    columns = sorted({(model, config) for _, model, config in cells}, key=lambda column: (column[1] != "with", column[0]))
    print("| Scenario | " + " | ".join(f"{model} {config}" for model, config in columns) + " |")
    print("|---|" + "---|" * len(columns))
    for scenario in expected:
        row = [f"{cells[(scenario, *column)][0]}/{cells[(scenario, *column)][1]}" if (scenario, *column) in cells else "-" for column in columns]
        print(f"| `{scenario}` | " + " | ".join(row) + " |")
    totals = []
    for column in columns:
        passed = sum(cells[key][0] for key in cells if key[1:] == column)
        total = sum(cells[key][1] for key in cells if key[1:] == column)
        totals.append(f"**{passed}/{total}**")
    print("| **Total** | " + " | ".join(totals) + " |")

    if failures:
        print("\nFailures:")
        for run, problems in failures:
            print(f"- {run}: " + "; ".join(problems))
    manual = [(name, spec["manual"]) for name, spec in expected.items() if spec.get("manual")]
    if manual:
        print("\nRead by hand:")
        for name, note in manual:
            print(f"- {name}: {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
