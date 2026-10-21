/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Os from 'os';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { OsqueryTrapResources } from './osquery_trap';

export const configureOsqueryTrapStatePath = (env: NodeJS.ProcessEnv = process.env): string => {
  const runId = env.OSQUERY_TRAP_RUN_ID;
  if (!runId) throw new Error('OSQUERY_TRAP_RUN_ID must be set before configuring trap state');

  const statePath =
    env.OSQUERY_TRAP_STATE_PATH ?? Path.join(Os.tmpdir(), `osquery-trap-${runId}.json`);
  if (!Path.isAbsolute(statePath)) {
    throw new Error('OSQUERY_TRAP_STATE_PATH must be an absolute file path outside the checkout');
  }

  const relativePath = Path.relative(REPO_ROOT, statePath);
  if (!relativePath.startsWith('..') && !Path.isAbsolute(relativePath)) {
    throw new Error('OSQUERY_TRAP_STATE_PATH must be outside the checkout');
  }

  env.OSQUERY_TRAP_STATE_PATH = statePath;
  return statePath;
};

export const writeOsqueryTrapState = async (
  statePath: string,
  resources: OsqueryTrapResources
): Promise<void> => {
  await Fs.writeFile(statePath, JSON.stringify(resources), { encoding: 'utf8', mode: 0o600 });
};

export const readOsqueryTrapState = async (statePath: string): Promise<OsqueryTrapResources> =>
  JSON.parse(await Fs.readFile(statePath, 'utf8')) as OsqueryTrapResources;
