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

/** Reads the generator's local git sha and dirty flag for artifact provenance; never throws. */
export function readLocalGitState(repoRoot: string, log: ToolingLog): LocalGitState {
  const git = (args: string[]) =>
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

  try {
    return {
      sha: git(['rev-parse', 'HEAD']).trim(),
      // Untracked files cannot change generator behaviour, so they don't count as dirty.
      dirty: git(['status', '--porcelain', '--untracked-files=no']).trim().length > 0,
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
