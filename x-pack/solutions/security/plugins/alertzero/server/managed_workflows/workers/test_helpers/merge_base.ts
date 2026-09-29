/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';

export type GitRunner = (args: readonly string[]) => string | undefined;

const runGit: GitRunner = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
};

/** Remote default branches (`origin/main`, `upstream/main`, …), plus the usual names as a fallback. */
const candidateBaseRefs = (git: GitRunner): string[] => {
  const heads = (git(['for-each-ref', '--format=%(symref:short)', 'refs/remotes/*/HEAD']) ?? '')
    .split('\n')
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);
  return [...new Set([...heads, 'origin/main', 'upstream/main'])];
};

/**
 * The commit this change is compared against. PR builds use the merge base Buildkite already
 * resolved and fail when it is not available, so the comparison never turns itself off in CI.
 * Locally the nearest remote default branch is used, and `undefined` means there is no base.
 */
export const resolveBaseCommit = (
  env: NodeJS.ProcessEnv = process.env,
  git: GitRunner = runGit
): string | undefined => {
  const prMergeBase = env.GITHUB_PR_MERGE_BASE;
  if (prMergeBase) {
    if (git(['cat-file', '-e', `${prMergeBase}^{commit}`]) === undefined) {
      throw new Error(
        `GITHUB_PR_MERGE_BASE ${prMergeBase} is not in this checkout, so stored Worker settings cannot be compared with the base branch.`
      );
    }
    return prMergeBase;
  }
  if (env.GITHUB_PR_NUMBER) {
    throw new Error(
      'This is a PR build without GITHUB_PR_MERGE_BASE, so stored Worker settings cannot be compared with the base branch.'
    );
  }

  let nearest: { commit: string; ahead: number } | undefined;
  for (const ref of candidateBaseRefs(git)) {
    const commit = git(['merge-base', 'HEAD', ref]);
    if (!commit) {
      continue;
    }
    const ahead = Number.parseInt(git(['rev-list', '--count', `${commit}..HEAD`]) ?? '', 10);
    if (Number.isNaN(ahead)) {
      continue;
    }
    if (nearest === undefined || ahead < nearest.ahead) {
      nearest = { commit, ahead };
    }
  }
  return nearest?.commit;
};

/** A file next to this module as it was at `commit`, or `undefined` when it did not exist there. */
export const readTestHelperFileAt = (
  commit: string,
  fileName: string,
  git: GitRunner = runGit
): string | undefined => git(['show', `${commit}:./${fileName}`]);
