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

const requireCommit = (git: GitRunner, name: string, commit: string | undefined): string => {
  if (!commit) {
    throw new Error(
      `This build has no ${name}, so stored Worker settings cannot be compared with the base branch.`
    );
  }
  if (git(['cat-file', '-e', `${commit}^{commit}`]) === undefined) {
    throw new Error(
      `${name} ${commit} is not in this checkout, so stored Worker settings cannot be compared with the base branch.`
    );
  }
  return commit;
};

/**
 * The commit to compare against. PR and merge-queue builds throw when theirs is unavailable, so the
 * check never silently turns off in CI. Other CI builds and runs with no remote return undefined.
 */
export const resolveBaseCommit = (
  env: NodeJS.ProcessEnv = process.env,
  git: GitRunner = runGit
): string | undefined => {
  if (env.GITHUB_PR_MERGE_BASE || env.GITHUB_PR_NUMBER) {
    return requireCommit(git, 'GITHUB_PR_MERGE_BASE', env.GITHUB_PR_MERGE_BASE);
  }
  if (env.MERGE_QUEUE_TARGET_BRANCH) {
    return requireCommit(git, 'MERGE_QUEUE_MERGE_BASE', env.MERGE_QUEUE_MERGE_BASE);
  }
  if (env.BUILDKITE === 'true') {
    return undefined;
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
): string | undefined => {
  const spec = `${commit}:./${fileName}`;
  if (git(['cat-file', '-e', spec]) === undefined) {
    return undefined;
  }
  const contents = git(['show', spec]);
  if (contents === undefined) {
    throw new Error(`git show ${spec} failed although the file exists at that commit.`);
  }
  return contents;
};
