#!/usr/bin/env bash
#
# parse_test_plan_scenarios.sh — Extract scenarios from a test-plan-generator markdown file.
#
# Usage:
#   parse_test_plan_scenarios.sh <test_plan.md> [--summary]
#
# Output: JSON to stdout
#   Default: { "scenarios": [...], "summary": { ... } }
#   --summary: summary object only
#
# Exit codes:
#   0  success
#   64 usage / argument error
#   66 file missing

set -euo pipefail

SUMMARY_ONLY=false
PLAN_FILE=''

usage() {
  sed -n '2,14p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --summary)
      SUMMARY_ONLY=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "$PLAN_FILE" ]]; then
        PLAN_FILE="$1"
        shift
      else
        echo "error: unexpected argument: $1" >&2
        usage >&2
        exit 64
      fi
      ;;
  esac
done

if [[ -z "$PLAN_FILE" ]]; then
  echo "error: test plan file path required" >&2
  usage >&2
  exit 64
fi

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "error: file not found: $PLAN_FILE" >&2
  exit 66
fi

export PLAN_FILE SUMMARY_ONLY

node <<'NODE'
const fs = require('fs');

const planFile = process.env.PLAN_FILE;
const summaryOnly = process.env.SUMMARY_ONLY === 'true';
const content = fs.readFileSync(planFile, 'utf8');

const MANUAL_MARKER = 'No existing tests found covering this scenario';

const classifyTag = (automationLine) => {
  const lower = automationLine.toLowerCase();
  if (lower.includes(MANUAL_MARKER.toLowerCase())) {
    return 'manual_only';
  }
  if (/\bpartial\b/.test(lower) && /\btest/.test(lower)) {
    return 'partial_automation';
  }
  if (/\b(unit|jest|scout|e2e|cypress|ftr|integration)\b/i.test(automationLine)) {
    return 'automated_in_plan';
  }
  return 'unknown';
};

let currentFeatureArea = '';
const scenarios = [];

const lines = content.split('\n');
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  const detailsMatch = line.match(/^<details>\s*$/);
  if (detailsMatch) {
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const summaryLine = lines[j];
      const sm = summaryLine.match(/^<summary><strong>(.+?)<\/strong>/);
      if (sm) {
        currentFeatureArea = sm[1].trim();
        break;
      }
    }
  }

  const scenarioMatch = line.match(/^#### Scenario:\s*(.+)$/);
  if (scenarioMatch) {
    const title = scenarioMatch[1].trim();
    let priority = '';
    let automationCoverage = '';
    let gherkin = '';
    let inGherkin = false;

    i++;
    while (i < lines.length && !lines[i].match(/^#### Scenario:/)) {
      const l = lines[i];

      if (l.match(/^## /) && !l.match(/^#### /)) {
        break;
      }
      if (l.match(/^<\/details>/)) {
        break;
      }

      const pri = l.match(/^\*\*Priority:\*\*\s*(P[012])/);
      if (pri) {
        priority = pri[1];
      }

      const auto = l.match(/^\*\*Automation coverage\*\*:\s*(.+)$/);
      if (auto) {
        automationCoverage = auto[1].trim();
      }

      if (l.match(/^```gherkin\s*$/)) {
        inGherkin = true;
        i++;
        const gherkinLines = [];
        while (i < lines.length && !lines[i].match(/^```\s*$/)) {
          gherkinLines.push(lines[i]);
          i++;
        }
        gherkin = gherkinLines.join('\n').trim();
        inGherkin = false;
        i++;
        continue;
      }

      i++;
    }

    scenarios.push({
      title,
      priority: priority || null,
      feature_area: currentFeatureArea || null,
      automation_coverage: automationCoverage,
      plan_tag: classifyTag(automationCoverage),
      gherkin,
    });
    continue;
  }

  i++;
}

const summary = {
  scenario_count: scenarios.length,
  manual_only_count: scenarios.filter((s) => s.plan_tag === 'manual_only').length,
  partial_automation_count: scenarios.filter((s) => s.plan_tag === 'partial_automation').length,
  automated_in_plan_count: scenarios.filter((s) => s.plan_tag === 'automated_in_plan').length,
  unknown_count: scenarios.filter((s) => s.plan_tag === 'unknown').length,
  p0_manual_only_count: scenarios.filter((s) => s.plan_tag === 'manual_only' && s.priority === 'P0')
    .length,
};

let manualOnlyFromTable = null;
const tableMatch = content.match(/\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|/);
if (tableMatch) {
  manualOnlyFromTable = parseInt(tableMatch[6], 10);
}

const result = {
  source_file: planFile,
  scenarios,
  summary,
  coverage_summary_manual_only: manualOnlyFromTable,
  coverage_summary_mismatch:
    manualOnlyFromTable !== null && manualOnlyFromTable !== summary.manual_only_count,
};

process.stdout.write(JSON.stringify(summaryOnly ? result.summary : result, null, 2));
process.stdout.write('\n');
NODE
