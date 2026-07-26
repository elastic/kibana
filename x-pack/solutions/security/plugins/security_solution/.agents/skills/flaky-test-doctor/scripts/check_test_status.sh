#!/usr/bin/env bash
# Gathers diagnostic information about a Cypress test file for flaky test analysis.
# Shows: skip status, git history, linked GitHub issues, environment tags, imported helpers.
#
# Usage:
#   bash .agents/skills/security-solution-flaky-test-doctor/scripts/check_test_status.sh \
#     path/to/test.cy.ts

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <cypress-test-file>"
  exit 1
fi

TEST_FILE="$1"

if [[ ! -f "$TEST_FILE" ]]; then
  echo "Error: File not found: $TEST_FILE"
  exit 1
fi

echo "=== Flaky Test Doctor: Diagnostic Report ==="
echo "File: $TEST_FILE"
echo ""

# --- Skip Status ---
echo "--- Skip Status ---"
if grep -nE '\.skip|@skipIn|it\.skip|describe\.skip' "$TEST_FILE" 2>/dev/null; then
  echo "  STATUS: SKIPPED (see matches above)"
else
  echo "  STATUS: Active (not skipped)"
fi
echo ""

# --- GitHub Issue Links ---
echo "--- Linked GitHub Issues ---"
ISSUES=$(grep -oE 'https://github\.com/elastic/kibana/issues/[0-9]+' "$TEST_FILE" 2>/dev/null | sort -u || true)
if [[ -n "$ISSUES" ]]; then
  echo "$ISSUES"
else
  echo "  No GitHub issue links found in test file"
fi
echo ""

# --- Environment Tags ---
echo "--- Environment Tags ---"
TAGS=$(grep -oE "@ess|@serverless|@serverlessQA|@skipInEss|@skipInServerless|@skipInServerlessMKI" "$TEST_FILE" 2>/dev/null | sort -u || true)
if [[ -n "$TAGS" ]]; then
  echo "$TAGS"
else
  echo "  No Cypress environment tags found"
fi
echo ""

# --- Recent Git History ---
echo "--- Recent Git History (last 15 commits) ---"
git log --oneline -15 -- "$TEST_FILE" 2>/dev/null || echo "  No git history available"
echo ""

# --- Skip/Unskip History ---
echo "--- Skip/Unskip Changes ---"
git log --oneline --all -10 -S '.skip' -- "$TEST_FILE" 2>/dev/null || echo "  No skip changes found"
echo ""

# --- Imported Screens Files ---
echo "--- Imported Screen Files ---"
grep "from '.*screens" "$TEST_FILE" 2>/dev/null | sed 's/.*from /  /' || echo "  None"
echo ""

# --- Imported Task Files ---
echo "--- Imported Task Files ---"
grep "from '.*tasks" "$TEST_FILE" 2>/dev/null | sed 's/.*from /  /' || echo "  None"
echo ""

# --- Test Count ---
echo "--- Test Summary ---"
IT_COUNT=$(grep -cE '^\s*it\(' "$TEST_FILE" 2>/dev/null || echo "0")
DESCRIBE_COUNT=$(grep -cE '^\s*describe\(' "$TEST_FILE" 2>/dev/null || echo "0")
echo "  Describe blocks: $DESCRIBE_COUNT"
echo "  Test cases (it): $IT_COUNT"
echo ""

# --- File Size ---
LINE_COUNT=$(wc -l < "$TEST_FILE" | tr -d ' ')
echo "  Total lines: $LINE_COUNT"
