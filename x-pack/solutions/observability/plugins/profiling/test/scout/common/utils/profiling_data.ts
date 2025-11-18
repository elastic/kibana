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
import type { ApiServicesFixture, KbnClient, ScoutTestConfig } from '@kbn/scout-oblt';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '@kbn/profiling-data-access-plugin/common';
import supertest from 'supertest';

const APM_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';

const esArchiversPath = Path.posix.join(
  __dirname,
  '..',
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

export async function loadProfilingData(es: Client, logger: ToolingLog) {
  const log = logWithTimer(logger);
  log(`Loading profiling data`);
  const content = fs.readFileSync(`${esArchiversPath}/data.json`, 'utf8');
  await es.bulk({ operations: content.split('\n'), refresh: 'wait_for' });
  log('Loaded profiling data');
}

export function buildKibanaUrl(config: ScoutTestConfig) {
  const { username, password } = config.auth;
  const { protocol, host, pathname } = new URL(config.hosts.kibana);

  let baseUrl;
  if (pathname === '/') {
    baseUrl = `${protocol}//${username}:${password}@${host}`;
  } else {
    baseUrl = `${protocol}//${username}:${password}@${host}${pathname}`;
  }
  return baseUrl;
}

export async function setupProfiling(
  apiServices: ApiServicesFixture,
  kbnClient: KbnClient,
  logger: ToolingLog
) {
  const log = logWithTimer(logger);

  await apiServices.fleet.internal.setup();
  log('Fleet infrastructure setup completed');
  await apiServices.fleet.agent.setup();
  log('Fleet agents setup completed');
  log('Checking if APM agent policy exists, creating if needed...');
  const getPolicyResponse = await apiServices.fleet.agent_policies.get({
    page: 1,
    perPage: 10,
  });
  const apmPolicyData = getPolicyResponse.data.items.find(
    (policy: { id: string }) => policy.id === 'policy-elastic-agent-on-cloud'
  );

  if (!apmPolicyData) {
    await apiServices.fleet.agent_policies.create(
      'Elastic APM',
      'default',
      false, // sysMonitoring
      {
        id: APM_AGENT_POLICY_ID,
        description: 'Elastic APM agent policy created via Fleet API',
      }
    );
    log(`APM agent policy '${APM_AGENT_POLICY_ID}' is created`);
  } else {
    log(`APM agent policy '${APM_AGENT_POLICY_ID}' already exists`);
  }

  const res = await kbnClient.request({
    path: '/api/profiling/setup/es_resources',
    method: 'GET',
  });
  // const res = await st
  //   .get('/api/profiling/setup/es_resources')
  //   .set({ 'kbn-xsrf': 'foo' })
  //   .set('x-elastic-internal-origin', 'Kibana');

  if (!res.data.has_setup) {
    log(`Setting up Universal Profiling`);
    await kbnClient.request({
      path: '/api/profiling/setup/es_resources',
      method: 'POST',
      headers: {
        'x-elastic-internal-origin': 'Kibana',
      },
    });
    // await st
    //   .post('/api/profiling/setup/es_resources')
    //   .set('x-elastic-internal-origin', 'Kibana');
  } else {
    log(`Skipping Universal Profiling set up, already set up`);
  }
  log(`Universal Profiling set up`);
}

export async function getProfilingPackagePolicyIds(config: ScoutTestConfig) {
  const st = supertest(buildKibanaUrl(config));
  const res = await st
    .get('/api/fleet/package_policies')
    .set({ 'kbn-xsrf': 'foo' })
    .set('x-elastic-internal-origin', 'Kibana');
  const policies: PackagePolicy[] = res.body.items;

  const collector = policies.find((item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME);
  const symbolizer = policies.find((item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME);

  return {
    collectorId: collector?.id,
    symbolizerId: symbolizer?.id,
  };
}

export async function cleanUpProfilingData({
  es,
  config,
  logger,
}: {
  es: Client;
  config: ScoutTestConfig;
  logger: ToolingLog;
}) {
  const log = logWithTimer(logger);
  log(`Unloading Profiling data`);

  const [indices, { collectorId, symbolizerId }] = await Promise.all([
    es.cat.indices({ format: 'json' }),
    getProfilingPackagePolicyIds(config),
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
    collectorId ? await deletePackagePolicy(config, collectorId) : Promise.resolve(),
    symbolizerId ? await deletePackagePolicy(config, symbolizerId) : Promise.resolve(),
  ]);
  log('Unloaded Profiling data');
}

export async function deletePackagePolicy(config: ScoutTestConfig, policy: string) {
  const st = supertest(buildKibanaUrl(config));
  return await st
    .post('/api/fleet/package_policies/delete')
    .set({ 'kbn-xsrf': 'foo' })
    .set('x-elastic-internal-origin', 'Kibana')
    .send({
      packagePolicyIds: [policy],
    });
}
