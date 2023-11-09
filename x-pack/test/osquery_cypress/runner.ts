/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';

import { verifyDockerInstalled, maybeCreateDockerNetwork } from '@kbn/es';
import { createToolingLogger } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import { FtrProviderContext } from './ftr_provider_context';

import { AgentManager } from './agent';
import { FleetManager } from './fleet_server';
import { createAgentPolicy } from './utils';

async function setupFleetAgent({ getService }: FtrProviderContext) {
  // const log = getService('log');
  const config = getService('config');
  const kbnClient = getService('kibanaServer');

  createToolingLogger.defaultLogLevel = 'verbose';
  const log = createToolingLogger();

  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);
  await new FleetManager(kbnClient, log).setup();

  const unique = Math.random().toString(32).substring(2, 6);
  const policyEnrollmentKey = await createAgentPolicy(kbnClient, log, `Default policy (${unique})`);
  const policyEnrollmentKeyTwo = await createAgentPolicy(
    kbnClient,
    log,
    `Osquery policy (${unique})`
  );

  const port = config.get('servers.fleetserver.port');

  await new AgentManager(policyEnrollmentKey, port, log, kbnClient).setup();
  await new AgentManager(policyEnrollmentKeyTwo, port, log, kbnClient).setup();
}

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
