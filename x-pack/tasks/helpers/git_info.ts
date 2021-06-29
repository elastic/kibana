/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
// @ts-ignore barely used, untyped module
import simpleGit from 'simple-git';

const gitDir = path.resolve(__dirname, '..', '..');

export async function gitInfo() {
  if (!fs.existsSync(path.join(gitDir, '.git'))) {
    // This info is only used for debugging purposes in the log
    // So if .git is not available for some reason, it's fine to output this
    return {
      number: 1,
      sha: process.env.GIT_COMMIT || process.env.BUILDKITE_COMMIT || 'none',
    };
  }
  const git = simpleGit(gitDir);

  return new Promise<{ number: number; sha: string }>((resolve, reject) => {
    git.log((err: undefined | Error, log: { total: number; latest: { hash: string } }) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          number: log.total,
          sha: log.latest.hash,
        });
      }
    });
  });
}
