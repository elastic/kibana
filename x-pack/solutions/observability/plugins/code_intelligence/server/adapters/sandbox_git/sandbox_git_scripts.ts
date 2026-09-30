/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Fixed bash scripts run through `SandboxSession.runCommand`. Every variable part (paths, refs,
 * patterns, offsets) arrives through the request `env` as a `CI_*` variable, never through the
 * command text: sandbox-service writes command text to `.sandbox_history`, which is uploaded
 * with every workspace snapshot.
 */

/** A probe failed: the clone is missing, not bare, bound to another remote, or lacks the pinned commit. */
export const PROBE_FAILED_EXIT = 97;
/** A spool file is missing or no longer has its recorded size. */
export const SPOOL_MISSING_EXIT = 96;
/** A pod-side file operation (mkdir, stat) failed. */
export const POD_IO_FAILED_EXIT = 95;
/** `git init` or `git remote add` failed. */
export const CLONE_SETUP_FAILED_EXIT = 90;
/** The remote has no such ref or commit. */
export const REVISION_NOT_FOUND_EXIT = 2;
/** The remote refused access or does not exist for these credentials. */
export const REMOTE_UNAVAILABLE_EXIT = 3;
/** A source-window path does not name an object at the pinned commit. */
export const OBJECT_MISSING_EXIT = 3;
/** A source-window path names a tree or other non-blob object. */
export const OBJECT_NOT_BLOB_EXIT = 4;

/** Git policy applied to every command: no hooks, no replace objects, no credential helpers, no system or global config. */
export const FIXED_GIT_ENV: Readonly<Record<string, string>> = {
  LC_ALL: 'C',
  LANGUAGE: 'C',
  GIT_NO_REPLACE_OBJECTS: '1',
  GIT_GRAFT_FILE: '',
  GIT_TERMINAL_PROMPT: '0',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
};

const GIT_FUNCTION = `g() { git --no-replace-objects -c core.hooksPath=/dev/null -c credential.helper= --git-dir="$CI_REPO" "$@"; }`;

/** Proves the clone at `$CI_REPO` is bare, bound to `$CI_REMOTE`, and contains `$CI_SHA`. */
const PROBE = `[ "$(g rev-parse --is-bare-repository 2>/dev/null)" = true ] && [ "$(g config --get remote.origin.url 2>/dev/null)" = "$CI_REMOTE" ] && g cat-file -e "$CI_SHA^{commit}" 2>/dev/null || exit ${PROBE_FAILED_EXIT}`;

/** Creates an empty bare repository bound to the remote and defines ref fetching with typed exits. */
const CLONE_SETUP = `classify() {
  case "$1" in
    *"couldn't find remote ref"*|*"not our ref"*|*"no such remote ref"*|*"unadvertised object"*) exit ${REVISION_NOT_FOUND_EXIT} ;;
    *"Authentication failed"*|*"could not read Username"*|*"terminal prompts disabled"*|*"not found"*|*" 401"*|*" 403"*) exit ${REMOTE_UNAVAILABLE_EXIT} ;;
  esac
  printf '%s' "$1" | head -c 4096 >&2
  exit 1
}
fetch_ref() {
  err=$(g fetch -q --depth 1 --no-tags --no-write-fetch-head --no-recurse-submodules origin "+$1:refs/code-intelligence/target" 2>&1 >/dev/null) || classify "$err"
}
rm -rf -- "$CI_REPO" && mkdir -p -- "$CI_ROOT" && git init -q --bare "$CI_REPO" >/dev/null && g remote add origin "$CI_REMOTE" || exit ${CLONE_SETUP_FAILED_EXIT}`;

/**
 * Shallow-clones one revision and prints its commit SHA. `$CI_KIND` is `head`, `sha`, `ref`
 * (a full `refs/heads/` or `refs/tags/` name), or `name` (a tag first, then a branch).
 */
export const RESOLVE_SCRIPT = `${GIT_FUNCTION}
${CLONE_SETUP}
case "$CI_KIND" in
  head) src=HEAD ;;
  sha|ref) src="$CI_REVISION" ;;
  name)
    out=$(g ls-remote origin "refs/tags/$CI_REVISION" "refs/heads/$CI_REVISION" 2>&1) || classify "$out"
    refs=$(printf '%s\\n' "$out" | cut -f2)
    if printf '%s\\n' "$refs" | grep -qxF -- "refs/tags/$CI_REVISION"; then src="refs/tags/$CI_REVISION"
    elif printf '%s\\n' "$refs" | grep -qxF -- "refs/heads/$CI_REVISION"; then src="refs/heads/$CI_REVISION"
    else exit ${REVISION_NOT_FOUND_EXIT}; fi ;;
  *) exit 1 ;;
esac
fetch_ref "$src"
g rev-parse --verify --end-of-options "refs/code-intelligence/target^{commit}" 2>/dev/null || exit ${REVISION_NOT_FOUND_EXIT}`;

/** Re-clones the pinned commit `$CI_SHA` after the clone was lost. */
export const RESTORE_SCRIPT = `${GIT_FUNCTION}
${CLONE_SETUP}
fetch_ref "$CI_SHA"
${PROBE}`;

/**
 * Runs one `git grep` or `git ls-tree` at the pinned commit into a pod spool capped at
 * `$CI_LIMIT` bytes, then prints `<git exit> <bytes> <blob digest>`.
 */
export const SCAN_SCRIPT = `${GIT_FUNCTION}
${PROBE}
mkdir -p -- "$CI_SPOOL_DIR" || exit ${POD_IO_FAILED_EXIT}
if [ "$CI_OP" = grep ]; then
  g grep --full-name -n -z -I -E \${CI_ICASE:+-i} -e "$CI_PATTERN" "$CI_SHA" -- \${CI_PATHSPEC:+"$CI_PATHSPEC"} 2>"$CI_SPOOL.err" | head -c "$CI_LIMIT" >"$CI_SPOOL"
  rc=\${PIPESTATUS[0]}
else
  g ls-tree -z --name-only \${CI_RECURSIVE:+-r} "$CI_SHA" -- \${CI_PATHSPEC:+"$CI_PATHSPEC"} 2>"$CI_SPOOL.err" | head -c "$CI_LIMIT" >"$CI_SPOOL"
  rc=\${PIPESTATUS[0]}
fi
head -c 4096 -- "$CI_SPOOL.err" >&2
rm -f -- "$CI_SPOOL.err"
size=$(( $(wc -c <"$CI_SPOOL") )) || exit ${POD_IO_FAILED_EXIT}
hash=$(git hash-object --no-filters "$CI_SPOOL") || exit ${POD_IO_FAILED_EXIT}
printf '%s %s %s\\n' "$rc" "$size" "$hash"`;

/** Prints `$CI_LENGTH` bytes of a spool from 1-based byte `$CI_START` as base64, after checking its size. */
export const CHUNK_SCRIPT = `${GIT_FUNCTION}
${PROBE}
[ -f "$CI_SPOOL" ] && [ "$(( $(wc -c <"$CI_SPOOL") ))" = "$CI_SIZE" ] || exit ${SPOOL_MISSING_EXIT}
tail -c "+$CI_START" "$CI_SPOOL" | head -c "$CI_LENGTH" | base64 | tr -d '\\n'`;

/**
 * Writes lines `$CI_START_LINE` onward (at most `$CI_LINE_COUNT`) of one blob into a spool capped
 * at `$CI_LIMIT` bytes. Prints `inline <bytes>` plus base64 content when the window is at most
 * `$CI_INLINE` bytes (and removes the spool), otherwise `spooled <bytes>`.
 */
export const WINDOW_SCRIPT = `${GIT_FUNCTION}
${PROBE}
obj="$CI_SHA:$CI_PATH"
t=$(g cat-file -t "$obj" 2>/dev/null) || exit ${OBJECT_MISSING_EXIT}
[ "$t" = blob ] || exit ${OBJECT_NOT_BLOB_EXIT}
mkdir -p -- "$CI_SPOOL_DIR" || exit ${POD_IO_FAILED_EXIT}
g cat-file blob "$obj" | tail -n "+$CI_START_LINE" | head -n "$CI_LINE_COUNT" | head -c "$CI_LIMIT" >"$CI_SPOOL"
size=$(( $(wc -c <"$CI_SPOOL") )) || exit ${POD_IO_FAILED_EXIT}
if [ "$size" -le "$CI_INLINE" ]; then
  printf 'inline %s\\n' "$size"
  base64 <"$CI_SPOOL" | tr -d '\\n'
  rm -f -- "$CI_SPOOL"
else
  printf 'spooled %s\\n' "$size"
fi`;

/** Removes one adapter-owned path. Callers only pass paths under the adapter root. */
export const REMOVE_SCRIPT = `rm -rf -- "$CI_TARGET"`;
