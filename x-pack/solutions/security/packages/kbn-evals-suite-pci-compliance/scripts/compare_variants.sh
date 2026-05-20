#!/bin/bash
# Side-by-side runner for the two PCI compliance skill variants.
#
# Runs Smriti's hand-written `pci-compliance` skill and the autonomously-architected
# `pci-compliance-autonomous` skill back-to-back through the SAME eval suite, captures
# per-scenario LLM-judge scores into per-variant directories, then asks the comparison
# HTML builder to render the side-by-side report.
#
# This script REQUIRES a configured AI connector on the test cluster (the @kbn/evals
# framework needs an LLM to call). If you do not have one, set EVAL_DRY_RUN=1 to
# generate the structural comparison HTML without live eval data — useful for
# previewing the report layout before you have credentials in place.
#
# Usage:
#   ./scripts/compare_variants.sh                 # full live run (both variants)
#   ./scripts/compare_variants.sh --variant handwritten   # only handwritten
#   ./scripts/compare_variants.sh --variant autonomous    # only autonomous
#   EVAL_DRY_RUN=1 ./scripts/compare_variants.sh  # structural HTML only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
KIBANA_ROOT="$(cd "$PKG_DIR/../../../../.." && pwd)"

OUT_DIR="${OUT_DIR:-$PKG_DIR/runs}"
HANDWRITTEN_DIR="$OUT_DIR/handwritten"
AUTONOMOUS_DIR="$OUT_DIR/autonomous"
HTML_OUT="${HTML_OUT:-$PKG_DIR/comparison.html}"

VARIANT_FILTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --variant) VARIANT_FILTER="$2"; shift 2 ;;
    --html-out) HTML_OUT="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,28p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 64 ;;
  esac
done

mkdir -p "$HANDWRITTEN_DIR" "$AUTONOMOUS_DIR"

run_variant() {
  local variant="$1"
  local server_config_set="$2"
  local out_dir="$3"

  if [[ -n "${EVAL_DRY_RUN:-}" ]]; then
    echo "[dry-run] would run variant=$variant via $server_config_set into $out_dir"
    return 0
  fi

  echo "─────────────────────────────────────────────────────────────"
  echo " Running PCI eval variant: $variant"
  echo "  serverConfigSet : $server_config_set"
  echo "  output dir      : $out_dir"
  echo "─────────────────────────────────────────────────────────────"

  (
    cd "$KIBANA_ROOT"
    EVAL_PCI_VARIANT="$variant" \
    EVAL_SERVER_CONFIG_SET="$server_config_set" \
    EVAL_OUTPUT_DIR="$out_dir" \
      node scripts/scout start-server \
        --arch stateful --domain classic \
        --serverConfigSet "$server_config_set" &
    local kibana_pid=$!
    trap "kill $kibana_pid 2>/dev/null || true" EXIT

    # Give the cluster up to 5 minutes to come up
    for i in $(seq 1 60); do
      if curl -fs http://localhost:5620/api/status >/dev/null 2>&1; then break; fi
      sleep 5
    done

    EVAL_PCI_VARIANT="$variant" \
      node scripts/evals start \
        --suite "pci-compliance$([ "$variant" = autonomous ] && echo "-autonomous" || true)" \
        --output "$out_dir" || true

    kill $kibana_pid 2>/dev/null || true
  )
}

if [[ -z "$VARIANT_FILTER" || "$VARIANT_FILTER" == "handwritten" ]]; then
  run_variant handwritten evals_pci_compliance "$HANDWRITTEN_DIR"
fi

if [[ -z "$VARIANT_FILTER" || "$VARIANT_FILTER" == "autonomous" ]]; then
  run_variant autonomous evals_pci_compliance_autonomous "$AUTONOMOUS_DIR"
fi

echo "─────────────────────────────────────────────────────────────"
echo " Building side-by-side HTML report …"
echo "─────────────────────────────────────────────────────────────"
node "$SCRIPT_DIR/build_comparison_html.mjs" \
  --handwritten "$HANDWRITTEN_DIR" \
  --autonomous "$AUTONOMOUS_DIR" \
  --out "$HTML_OUT"

echo "Done — open: $HTML_OUT"
