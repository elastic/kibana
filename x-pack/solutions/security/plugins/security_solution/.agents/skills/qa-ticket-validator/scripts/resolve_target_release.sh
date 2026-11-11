#!/usr/bin/env bash
#
# resolve_target_release.sh — Resolve QA target release and merge-commit version.
#
# Usage (standalone):
#   resolve_target_release.sh [--release <version>] [--plan-json <file>] [--repo-root <path>]
#
# When sourced:
#   resolve_target_release [--release <version>] [--plan-json <file>]
#   resolve_merge_version <merge_sha> [--repo-root <path>]
#
# Priority for target_release:
#   1. --release CLI flag
#   2. QA_TARGET_RELEASE env (from live.env)
#   3. plan-#N.json (or --plan-json) → qa_cycle.release_hint
#   4. package.json .version on current checkout (main default)
#
# Writes JSON to stdout:
#   { "target_release": "9.5.0", "target_release_source": "main_default" }

set -euo pipefail

_resolve_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_resolve_repo_root="$(git -C "$_resolve_script_dir" rev-parse --show-toplevel 2>/dev/null || pwd)"

_normalize_version() {
  local raw="${1:-}"
  raw="${raw#v}"
  raw="${raw#V}"
  if [[ "$raw" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
    echo "$raw"
    return 0
  fi
  return 1
}

_main_package_version() {
  local root="${1:-$_resolve_repo_root}"
  if [[ -f "$root/package.json" ]]; then
    jq -r '.version // empty' "$root/package.json" 2>/dev/null || true
  fi
}

_release_hint_from_plan() {
  local plan_json="${1:-}"
  if [[ -z "$plan_json" || ! -f "$plan_json" ]]; then
    return 1
  fi
  local hint
  hint="$(jq -r '.qa_cycle.release_hint // empty' "$plan_json" 2>/dev/null || true)"
  if [[ -n "$hint" && "$hint" != 'null' ]]; then
    _normalize_version "$hint" && return 0
  fi
  hint="$(jq -r '.qa_cycle.target_release // empty' "$plan_json" 2>/dev/null || true)"
  if [[ -n "$hint" && "$hint" != 'null' ]]; then
    _normalize_version "$hint" && return 0
  fi
  return 1
}

resolve_target_release() {
  local cli_release=''
  local plan_json=''
  local repo_root="$_resolve_repo_root"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --release)
        cli_release="${2:-}"
        shift 2
        ;;
      --release=*)
        cli_release="${1#--release=}"
        shift
        ;;
      --plan-json)
        plan_json="${2:-}"
        shift 2
        ;;
      --plan-json=*)
        plan_json="${1#--plan-json=}"
        shift
        ;;
      --repo-root)
        repo_root="${2:-}"
        shift 2
        ;;
      --repo-root=*)
        repo_root="${1#--repo-root=}"
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  local version=''
  local source=''

  if [[ -n "$cli_release" ]]; then
    version="$(_normalize_version "$cli_release" || true)"
    if [[ -n "$version" ]]; then
      source='cli'
    fi
  fi

  if [[ -z "$version" && -n "${QA_TARGET_RELEASE:-}" ]]; then
    version="$(_normalize_version "$QA_TARGET_RELEASE" || true)"
    if [[ -n "$version" ]]; then
      source='live.env'
    fi
  fi

  if [[ -z "$version" ]]; then
    version="$(_release_hint_from_plan "$plan_json" || true)"
    if [[ -n "$version" ]]; then
      source='plan'
    fi
  fi

  if [[ -z "$version" ]]; then
    version="$(_main_package_version "$repo_root")"
    if [[ -n "$version" ]]; then
      source='main_default'
    fi
  fi

  jq -n \
    --arg target_release "$version" \
    --arg target_release_source "$source" \
    '{
      target_release: (if $target_release == "" then null else $target_release end),
      target_release_source: (if $target_release_source == "" then null else $target_release_source end)
    }'
}

resolve_merge_version() {
  local merge_sha="${1:-}"
  local repo_root="${2:-$_resolve_repo_root}"

  if [[ -z "$merge_sha" ]]; then
    jq -n '{merge_version: null}'
    return 0
  fi

  local version
  version="$(git -C "$repo_root" show "${merge_sha}:package.json" 2>/dev/null \
    | jq -r '.version // empty' || true)"

  jq -n --arg merge_version "$version" \
    '{merge_version: (if $merge_version == "" then null else $merge_version end)}'
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  CLI_RELEASE=''
  PLAN_JSON=''
  REPO_ROOT="$_resolve_repo_root"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --release)
        CLI_RELEASE="${2:-}"
        shift 2
        ;;
      --release=*)
        CLI_RELEASE="${1#--release=}"
        shift
        ;;
      --plan-json)
        PLAN_JSON="${2:-}"
        shift 2
        ;;
      --plan-json=*)
        PLAN_JSON="${1#--plan-json=}"
        shift
        ;;
      --repo-root)
        REPO_ROOT="${2:-}"
        shift 2
        ;;
      --repo-root=*)
        REPO_ROOT="${1#--repo-root=}"
        shift
        ;;
      -h|--help)
        sed -n '2,18p' "$0"
        exit 0
        ;;
      *)
        echo "error: unknown argument '$1'" >&2
        exit 64
        ;;
    esac
  done

  resolve_target_release --release "$CLI_RELEASE" --plan-json "$PLAN_JSON" --repo-root "$REPO_ROOT"
fi
