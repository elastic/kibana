/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import { getRoutePaths } from '@kbn/profiling-plugin/common';
import { ProfilingStatus } from '@kbn/profiling-utils';
import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import Path from 'path';
import { BetterTest } from '../common/bettertest';
import { deletePackagePolicy, getProfilingPackagePolicyIds } from './fleet';

const profilingRoutePaths = getRoutePaths();

const esArchiversPath = Path.posix.join(
  __dirname,
  '..',
  'common',
  'fixtures',
  'es_archiver',
  'profiling'
);

function logWithTimer(logger: ToolingLog) {
  const start = process.hrtime();

  return (message: string) => {
    const diff = process.hrtime(start);
    const time = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
    logger.info(`(${time}) ${message}`);
  };
}

export async function cleanUpProfilingData({
  es,
  bettertest,
  logger,
}: {
  es: Client;
  bettertest: BetterTest;
  logger: ToolingLog;
}) {
  const log = logWithTimer(logger);
  log(`Unloading Profiling data`);

  const [indices, { collectorId, symbolizerId }] = await Promise.all([
    es.cat.indices({ format: 'json' }),
    getProfilingPackagePolicyIds(bettertest),
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
    collectorId ? deletePackagePolicy(bettertest, collectorId) : Promise.resolve(),
    symbolizerId ? deletePackagePolicy(bettertest, symbolizerId) : Promise.resolve(),
  ]);
  log('Unloaded Profiling data');
}

export async function setupProfiling(bettertest: BetterTest, logger: ToolingLog) {
  const log = logWithTimer(logger);
  const response = await bettertest<ProfilingStatus>({
    method: 'get',
    pathname: profilingRoutePaths.HasSetupESResources,
  });

  if (response.body.has_setup) {
    log(`Skipping Universal Profiling set up, already set up`);
  } else {
    log(`Setting up Universal Profiling`);
    await bettertest<ProfilingStatus>({
      method: 'post',
      pathname: profilingRoutePaths.HasSetupESResources,
    });
    log(`Universal Profiling set up`);
  }
}

export async function loadProfilingData(es: Client, logger: ToolingLog) {
  const log = logWithTimer(logger);
  log(`Loading profiling data`);
  const content = fs.readFileSync(`${esArchiversPath}/data.json`, 'utf8');
  await es.bulk({ operations: content.split('\n'), refresh: 'wait_for' });
  log('Loaded profiling data');
}
