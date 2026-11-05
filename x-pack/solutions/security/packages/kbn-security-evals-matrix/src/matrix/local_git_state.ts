/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';

export interface LocalGitState {
  sha?: string;
  dirty?: boolean;
}

/**
 * Reads the generator's local git sha and dirty flag for artifact provenance; never throws.
 *
 * `inputPaths` are paths read as CODE INPUTS (e.g. `--config`) rather than source files: an
 * untracked config changes every matrix score exactly like a tracked edit, so unlike the
 * repo-wide check below it must not exclude untracked files, or an untracked `--config` could
 * change every published score while `dirtyWorkingTree: false` still stamps the run as
 * reproducible from the current commit.
 */
export function readLocalGitState(
  repoRoot: string,
  log: ToolingLog,
  inputPaths: string[] = []
): LocalGitState {
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

  try {
    // Untracked files elsewhere in the repo cannot change generator behaviour, so they don't
    // count as dirty here — but any of `inputPaths` must, tracked or not (see doc above).
    const treeDirty = git(['status', '--porcelain', '--untracked-files=no']).trim().length > 0;
    const inputsDirty =
      inputPaths.length > 0 &&
      git(['status', '--porcelain', '--untracked-files=all', '--', ...inputPaths]).trim().length >
        0;
    return {
      sha: git(['rev-parse', 'HEAD']).trim(),
      dirty: treeDirty || inputsDirty,
    };
  } catch (error) {
    log.debug(
      `Could not read local git state for provenance: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {};
  }
}
