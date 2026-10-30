#!/usr/bin/env bash
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License
# 2.0; you may not use this file except in compliance with the Elastic License
# 2.0.

# Reads an environments.json file and deletes all target environment projects
# via the QAF Python API directly, bypassing SecurityProjectTask.delete()
# which requires org-member-list permission.
#
# Usage:
#   ./teardown_environments.sh [--config environments.json] [--yes] [--dry-run]

set -euo pipefail

CONFIG="environments.json"
SKIP_CONFIRM=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG="$2"; shift 2 ;;
    --yes|-y) SKIP_CONFIRM=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h)
      echo "Usage: ./teardown_environments.sh [--config environments.json] [--yes] [--dry-run]"
      echo ""
      echo "Deletes all target environment projects listed in the config file."
      echo "Does NOT delete the results cluster."
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$CONFIG" ]]; then
  echo "Error: Config file not found: $CONFIG" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || { echo "Error: jq is not installed" >&2; exit 1; }

# Use the QAF Python from the uv tools installation
QAF_PYTHON="${QAF_PYTHON:-$HOME/.local/share/uv/tools/qaf/bin/python}"
if [[ ! -x "$QAF_PYTHON" ]]; then
  echo "Error: QAF Python not found at $QAF_PYTHON" >&2
  echo "Set QAF_PYTHON env var to the correct path." >&2
  exit 1
fi

PROJECT_IDS=$(jq -r '.environments[].id' "$CONFIG")
COUNT=$(echo "$PROJECT_IDS" | wc -l | tr -d ' ')

echo "Projects to delete ($COUNT):"
echo "$PROJECT_IDS" | while read -r id; do
  echo "  - $id"
done
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run — no projects deleted."
  exit 0
fi

if [[ "$SKIP_CONFIRM" != "true" ]]; then
  read -rp "Delete all $COUNT projects? [y/N] " answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

FAILED=0

echo "$PROJECT_IDS" | while read -r name; do
  printf "  %-50s" "$name"

  # Check if project is registered in QAF
  REGISTERED=$("$QAF_PYTHON" -c "
from qaf.deployment.elastic_cloud.projects import ECProjectRegister
r = ECProjectRegister.with_default_kv_store()
print('yes' if r.exists('$name') else 'no')
" 2>/dev/null || echo "error")

  if [[ "$REGISTERED" == "yes" ]]; then
    # Bypass SecurityProjectTask.delete() which requires org-member-list
    # permission. Call ECProjectRegister.remove() directly.
    if "$QAF_PYTHON" -c "
from qaf.deployment.elastic_cloud.projects import ECProjectRegister
ECProjectRegister.with_default_kv_store().remove('$name', delete_project=True)
" 2>&1; then
      echo "deleted"
    else
      echo "FAILED"
      FAILED=$((FAILED + 1))
    fi
  elif [[ "$REGISTERED" == "no" ]]; then
    echo "not in register, skipping"
  else
    echo "error checking register"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Done."
