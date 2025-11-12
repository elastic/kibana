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
import type { ApiServicesFixture } from '@kbn/scout-oblt';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '@kbn/profiling-data-access-plugin/common';
import supertest from 'supertest';
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

export async function setupProfiling(
  kbnUrl: string,
  apiServices: ApiServicesFixture,
  logger: ToolingLog
) {
  const log = logWithTimer(logger);
  const { username, password, protocol, host, pathname } = new URL(kbnUrl);

  let baseUrl;
  if (pathname === '/') {
    baseUrl = `${protocol}//${username}:${password}@${host}`;
  } else {
    baseUrl = `${protocol}//${username}:${password}@${host}${pathname}`;
  }

  const st = supertest(baseUrl);

  await apiServices.fleet.agent.setup();
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

export async function getProfilingPackagePolicyIds(apiServices: ApiServicesFixture) {
  return apiServices.fleet.agent_policies.get().then((response) => {
    const policies: PackagePolicy[] = response.data.items;

    const collector = policies.find((item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME);
    const symbolizer = policies.find((item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME);
    return {
      collectorId: collector?.id,
      symbolizerId: symbolizer?.id,
    };
  });
}

export async function cleanUpProfilingData({
  es,
  apiServices,
  logger,
}: {
  es: Client;
  apiServices: ApiServicesFixture;
  logger: ToolingLog;
}) {
  const log = logWithTimer(logger);
  log(`Unloading Profiling data`);

  const [indices, { collectorId, symbolizerId }] = await Promise.all([
    es.cat.indices({ format: 'json' }),
    getProfilingPackagePolicyIds(apiServices),
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
    collectorId ? apiServices.fleet.agent_policies.delete(collectorId) : Promise.resolve(),
    symbolizerId ? apiServices.fleet.agent_policies.delete(symbolizerId) : Promise.resolve(),
  ]);
  log('Unloaded Profiling data');
}
