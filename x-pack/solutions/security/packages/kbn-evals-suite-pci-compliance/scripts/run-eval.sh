#!/usr/bin/env bash
# Usage: run-eval.sh <variant> <connector_id> <out_label> [scenario-grep]
#   variant: handwritten | autonomous
#   connector_id: e.g. pmeClaudeV46SonnetUsEast1
#   out_label: e.g. sonnet46-autonomous
#   scenario-grep: optional Playwright --grep pattern (e.g. "requirement 2.2.4")
#                  if set, only the matching scenarios run -- shrinks a full
#                  20-30 min eval to ~3 min for a single failing case.
#
# Boots Scout against the right config set, waits for ready, runs the
# kbn-evals-suite-pci-compliance suite, captures the ES results into
# `runs/<out_label>/results.json` inside the worktree, then tears scout down.

set -uo pipefail

VARIANT="${1:?variant required}"
CONNECTOR="${2:?connector required}"
LABEL="${3:?label required}"
SCENARIO_GREP="${4:-}"

WORKTREE=/Users/patrykkopycinski/Projects/kibana-worktrees/autonomous-vs-handwritten-pci
RUNS_DIR="$WORKTREE/x-pack/solutions/security/packages/kbn-evals-suite-pci-compliance/runs/$LABEL"
LOG_DIR=/Users/patrykkopycinski/eval-runs
SCOUT_LOG="$LOG_DIR/scout-$LABEL.log"
EVAL_LOG="$LOG_DIR/eval-$LABEL.log"

if [ "$VARIANT" = "autonomous" ]; then
  CONFIG_SET=evals_pci_compliance_autonomous
else
  CONFIG_SET=evals_pci_compliance
fi

mkdir -p "$RUNS_DIR" "$LOG_DIR"

export PATH="/Users/patrykkopycinski/.nvm/versions/node/v24.14.1/bin:$PATH"
cd "$WORKTREE"

echo "[run-eval] variant=$VARIANT connector=$CONNECTOR label=$LABEL config_set=$CONFIG_SET"

# Hard kill any leftover scout / playwright
pkill -KILL -f "scout.js start-server" 2>/dev/null || true
pkill -KILL -f "playwright test --config.*pci" 2>/dev/null || true
sleep 3

echo "[run-eval] starting scout..."
SCOUT_READ_DEV_CONFIG=true node scripts/scout.js start-server \
  --arch stateful --domain classic \
  --serverConfigSet "$CONFIG_SET" --logToFile \
  > "$SCOUT_LOG" 2>&1 &
SCOUT_PID=$!
echo "[run-eval] scout pid=$SCOUT_PID"

# Wait up to 6 min for scout to come up
WAITED=0
while ! grep -q "ready for functional testing" "$SCOUT_LOG" 2>/dev/null; do
  if [ $WAITED -ge 360 ]; then
    echo "[run-eval] scout never reported ready in 6 min; bailing" >&2
    kill -KILL $SCOUT_PID 2>/dev/null || true
    exit 11
  fi
  if ! kill -0 $SCOUT_PID 2>/dev/null; then
    echo "[run-eval] scout died while booting" >&2
    exit 12
  fi
  sleep 5
  WAITED=$((WAITED + 5))
done
echo "[run-eval] scout ready after ${WAITED}s"

echo "[run-eval] running eval${SCENARIO_GREP:+ (grep=\"$SCENARIO_GREP\")}..."
# Build the eval command using printf-quoted args so we can survive `set -u`.
EVAL_CMD=(node scripts/evals.js run --suite pci-compliance-autonomous --judge "$CONNECTOR" --model "$CONNECTOR")
if [ -n "$SCENARIO_GREP" ]; then
  EVAL_CMD+=(--grep "$SCENARIO_GREP")
fi
EVAL_PCI_VARIANT="$VARIANT" EVALUATION_CONNECTOR_ID="$CONNECTOR" \
  "${EVAL_CMD[@]}" \
  > "$EVAL_LOG" 2>&1
EVAL_RC=$?
echo "[run-eval] eval exit=$EVAL_RC"

# Capture ES data immediately, BEFORE scout teardown
echo "[run-eval] capturing ES results..."
curl -sS -u elastic:changeme \
  "http://localhost:9220/kibana-evaluations/_search?size=200" \
  -H 'Content-Type: application/json' \
  --data "{\"query\":{\"term\":{\"evaluator.model.id\":\"$3-placeholder\"}}, \"sort\":[{\"@timestamp\":{\"order\":\"desc\"}}]}" \
  > "$RUNS_DIR/results.raw.json"

# Use a query that's connector-id-agnostic — capture everything, we'll filter offline.
curl -sS -u elastic:changeme \
  "http://localhost:9220/kibana-evaluations/_search?size=200" \
  -H 'Content-Type: application/json' \
  --data '{"query":{"match_all":{}}, "sort":[{"@timestamp":{"order":"desc"}}]}' \
  > "$RUNS_DIR/results.json"

DOC_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$RUNS_DIR/results.json','utf8')).hits.hits.length)" 2>/dev/null || echo "?")
echo "[run-eval] captured $DOC_COUNT docs"

echo "[run-eval] tearing scout down..."
kill -TERM $SCOUT_PID 2>/dev/null || true
sleep 5
kill -KILL $SCOUT_PID 2>/dev/null || true
pkill -KILL -f "scout.js start-server" 2>/dev/null || true

echo "[run-eval] DONE eval_rc=$EVAL_RC docs=$DOC_COUNT"
exit $EVAL_RC
