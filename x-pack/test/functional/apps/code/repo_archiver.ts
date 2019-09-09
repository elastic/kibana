/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import del from 'del';
// @ts-ignore
import extractZip from 'extract-zip';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { promisify } from 'util';

const asyncExtractZip = promisify(extractZip);
const asyncMkdirp = promisify(mkdirp);

const archiveFilePath = (zipFileName: string) => {
  return path.resolve(__dirname, `./fixtures/${zipFileName}.zip`);
};

const repoDir = (repoUri: string, kibanaDir: string) => {
  return path.resolve(kibanaDir, `data/code/repos/${repoUri}`);
};

const workspaceDir = (repoUri: string, kibanaDir: string) => {
  return path.resolve(kibanaDir, `data/code/workspace/${repoUri}`);
};

const unzip = async (filepath: string, target: string) => {
  if (!fs.existsSync(target)) {
    await asyncMkdirp(target);
  }
  await asyncExtractZip(filepath, { dir: target });
};

export const load = async (repoUri: string, zipFileName: string, kibanaDir: string) => {
  const dir = repoDir(repoUri, kibanaDir);
  const zipRepoPath = archiveFilePath(zipFileName);
  // Try to unload first in case the folder already exists
  await unload(repoUri, kibanaDir);
  return unzip(zipRepoPath, dir);
};

export const unload = async (repoUri: string, kibanaDir: string) => {
  const dir = repoDir(repoUri, kibanaDir);
  const wsDir = workspaceDir(repoUri, kibanaDir);
  return del([dir, wsDir], { force: true });
};
