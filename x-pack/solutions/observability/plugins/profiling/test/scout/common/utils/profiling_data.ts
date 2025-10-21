/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import Path from 'path';
import type TestAgent from 'supertest/lib/agent';
import { deletePackagePolicy, getProfilingPackagePolicyIds } from './fleet';
import { getRoutePaths } from '../../../../common';

const esArchiversPath = Path.posix.join(
  __dirname,
  '..',
  '..',
  'common',
  'fixtures',
  'es_archiver',
  'profiling'
);

const profilingRoutePaths = getRoutePaths();

function logWithTimer(logger: ToolingLog) {
  const start = process.hrtime();

  return (message: string) => {
    const diff = process.hrtime(start);
    const time = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
    logger.info(`(${time}) ${message}`);
  };
}

export async function loadProfilingData(es: Client, logger: ToolingLog) {
  const log = logWithTimer(logger);
  log(`Loading profiling data`);
  const content = fs.readFileSync(`${esArchiversPath}/data.json`, 'utf8');
  await es.bulk({ operations: content.split('\n'), refresh: 'wait_for' });
  log('Loaded profiling data');
}

export async function setupProfiling(st: TestAgent, logger: ToolingLog) {
  const log = logWithTimer(logger);

  await st
    .post('/api/fleet/setup')
    .set({ 'kbn-xsrf': 'foo' })
    .set('x-elastic-internal-origin', 'Kibana');

  const res = await st
    .get(profilingRoutePaths.HasSetupESResources)
    .set({ 'kbn-xsrf': 'foo' })
    .set('x-elastic-internal-origin', 'Kibana');

  if (!res.body.has_setup) {
    log(`Setting up Universal Profiling`);
    await st
      .post(profilingRoutePaths.HasSetupESResources)
      .set({ 'kbn-xsrf': 'foo' })
      .set('x-elastic-internal-origin', 'Kibana');
  } else {
    log(`Skipping Universal Profiling set up, already set up`);
  }
  log(`Universal Profiling set up`);
}

export async function cleanUpProfilingData({
  es,
  st,
  logger,
}: {
  es: Client;
  st: TestAgent;
  logger: ToolingLog;
}) {
  const log = logWithTimer(logger);
  log(`Unloading Profiling data`);

  const [indices, { collectorId, symbolizerId }] = await Promise.all([
    es.cat.indices({ format: 'json' }),
    getProfilingPackagePolicyIds(st),
  ]);

  const profilingIndices = indices
    .filter((index) => index.index !== undefined)
    .map((index) => index.index)
    .filter((index) => {
      return index!.startsWith('profiling') || index!.startsWith('.profiling');
    }) as string[];

  await Promise.all([
    ...profilingIndices.map((index) => es.indices.delete({ index })),
    es.indices.deleteDataStream({
      name: 'profiling-events*',
    }),
    collectorId ? deletePackagePolicy(st, collectorId) : Promise.resolve(),
    symbolizerId ? deletePackagePolicy(st, symbolizerId) : Promise.resolve(),
  ]);
  log('Unloaded Profiling data');
}
