/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
// @ts-ignore barely used, untyped module
import simpleGit from 'simple-git';

const gitDir = path.resolve(__dirname, '..', '..');

export async function gitInfo() {
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
