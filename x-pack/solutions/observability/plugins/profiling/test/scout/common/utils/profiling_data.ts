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
import type { ApiServicesFixture, ScoutTestConfig } from '@kbn/scout-oblt';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '@kbn/profiling-data-access-plugin/common';

const APM_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';

export const esArchiversPath = Path.join(
  __dirname,
  '..',
  '..',
  'common',
  'fixtures',
  'es_archiver',
  'profiling',
  'data.json'
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

export async function setupFleet(apiServices: ApiServicesFixture, logger: ToolingLog) {
  const log = logWithTimer(logger);
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
}

// export async function setupProfiling(
//   apiServices: ApiServicesFixture,
//   kbnClient: KbnClient,
//   logger: ToolingLog
// ) {

//   const checkStatus = await (async () => {
//     try {
//       const response = await kbnClient.request({
//         description: 'Check profiling status',
//         path: '/api/profiling/setup/es_resources',
//         method: 'GET',
//       });
//       log(`Checked profiling status: ${JSON.stringify(response.data)}`);
//       return response.data as { has_setup: boolean; has_data: boolean };
//     } catch (error: any) {
//       log(`Error checking profiling status: ${error}`);
//       return { has_setup: false, has_data: false };
//     }
//   })();

//   if (!checkStatus.has_setup) {
//     log(`Setting up Universal Profiling`);

//     try {
//       await kbnClient.request({
//         description: 'Setup profiling resources',
//         path: '/api/profiling/setup/es_resources',
//         method: 'POST',
//         body: {},
//       });
//     } catch (error: any) {
//       log(`Error setting up profiling resources: ${error}`);
//     }
//   } else {
//     log(`Skipping Universal Profiling set up, already set up`);
//   }
//   log(`Universal Profiling set up`);
// }

export async function getProfilingPackagePolicyIds(apiServices: ApiServicesFixture) {
  const res = await apiServices.fleet.package_policies.get();
  const policies: PackagePolicy[] = res.data.items;

  const collector = policies.find((item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME);
  const symbolizer = policies.find((item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME);

  return {
    collectorId: collector?.id,
    symbolizerId: symbolizer?.id,
  };
}

export async function cleanUpProfiling({
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
    collectorId ? apiServices.fleet.package_policies.delete(collectorId) : Promise.resolve(),
    symbolizerId ? apiServices.fleet.package_policies.delete(symbolizerId) : Promise.resolve(),
  ]);
  log('Unloaded Profiling data');
}
