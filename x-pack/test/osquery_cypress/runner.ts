/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';

import { verifyDockerInstalled, maybeCreateDockerNetwork } from '@kbn/es';
import { startRuntimeServices } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/runtime';
import { waitForHostToEnroll } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';
import { FtrProviderContext } from './ftr_provider_context';

import { AgentManager } from './agent';
import { FleetManager } from './fleet_server';
import { createAgentPolicy, getLatestAvailableAgentVersion } from './utils';

async function setupFleetAgent({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const kbnClient = getService('kibanaServer');

  const elasticUrl = Url.format(config.get('servers.elasticsearch'));
  const kibanaUrl = Url.format(config.get('servers.kibana'));
  const fleetServerUrl = Url.format({
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    port: config.get('servers.fleetserver.port'),
  });
  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');

  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);

  await startRuntimeServices({
    log,
    elasticUrl,
    kibanaUrl,
    fleetServerUrl,
    username,
    password,
    version: await getLatestAvailableAgentVersion(kbnClient),
  });

  await new FleetManager(log).setup();

  const policyEnrollmentKey = await createAgentPolicy(kbnClient, log, 'Default policy');
  const policyEnrollmentKeyTwo = await createAgentPolicy(kbnClient, log, 'Osquery policy');

  const port = config.get('servers.fleetserver.port');
  try {
    await createAndEnrollAgent(policyEnrollmentKey, port, log, kbnClient);
    await createAndEnrollAgent(policyEnrollmentKeyTwo, port, log, kbnClient);
  } catch (error) {
    throw new Error('WTF?', error);
  }
}

const createAndEnrollAgent = async (enrollmentKey, port, log, kbnClient, attempt = 1) => {
  let agent;
  try {
    agent = await new AgentManager(enrollmentKey, port, log, kbnClient).setup();
    const short = agent.substring(0, 12);
    await waitForHostToEnroll(kbnClient, short);
  } catch (err) {
    agent.cleanup();
    if (attempt < 3) {
      await createAndEnrollAgent(enrollmentKey, port, log, kbnClient, attempt + 1); // Recursive call with incremented attempt
    } else {
      throw new Error('Reached maximum attempts. Exiting recursion.');
    }
  }
};

export async function startOsqueryCypress(context: FtrProviderContext) {
  const config = context.getService('config');

  await setupFleetAgent(context);

  return {
    FORCE_COLOR: '1',
    baseUrl: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
    protocol: config.get('servers.kibana.protocol'),
    hostname: config.get('servers.kibana.hostname'),
    configport: config.get('servers.kibana.port'),
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.kibana.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.kibana.password'),
    KIBANA_URL: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
  };
}
