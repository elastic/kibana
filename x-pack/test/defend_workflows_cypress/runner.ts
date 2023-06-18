/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import { startRuntimeServices } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/runtime';
import { FtrProviderContext } from './ftr_provider_context';
import { AgentManager } from './agent';
import { FleetManager } from './fleet_server';
import { getLatestAvailableAgentVersion } from './utils';

type RunnerEnv = Record<string, string | undefined>;

async function withFleetAgent(
  { getService }: FtrProviderContext,
  runner: (runnerEnv: RunnerEnv) => RunnerEnv
) {
  const log = getService('log');
  const config = getService('config');
  const kbnClient = getService('kibanaServer');

  const elasticUrl = Url.format(config.get('servers.elasticsearch'));
  const kibanaUrl = Url.format(config.get('servers.kibana'));
  const fleetServerUrl = config.get('servers.fleetserver')
    ? Url.format(config.get('servers.fleetserver'))
    : undefined;
  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');

  await startRuntimeServices({
    log,
    elasticUrl,
    kibanaUrl,
    fleetServerUrl,
    username,
    password,
    version: await getLatestAvailableAgentVersion(kbnClient),
  });

  const fleetManager = new FleetManager(log);
  const agentManager = new AgentManager(log);

  await fleetManager.setup();
  const agentVmName = await agentManager.setup();
  try {
    await runner({ agentVmName });
  } finally {
    agentManager.cleanup();
    fleetManager.cleanup();
  }
}

export async function DefendWorkflowsCypressCliTestRunner(context: FtrProviderContext) {
  return startDefendWorkflowsCypress(context, 'dw:run');
}

export async function DefendWorkflowsCypressVisualTestRunner(context: FtrProviderContext) {
  return startDefendWorkflowsCypress(context, 'dw:open');
}

export async function DefendWorkflowsCypressEndpointTestRunner(context: FtrProviderContext) {
  return withFleetAgent(context, (runnerEnv) =>
    startDefendWorkflowsCypress(context, 'dw:endpoint:open', runnerEnv)
  );
}

function startDefendWorkflowsCypress(
  context: FtrProviderContext,
  cypressCommand: 'dw:endpoint:open' | 'dw:open' | 'dw:run',
  runnerEnv?: RunnerEnv
) {
  const config = context.getService('config');

  return {
    FORCE_COLOR: '1',
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.kibana.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.kibana.password'),
    FLEET_SERVER_URL: config.get('servers.fleetserver')
      ? Url.format(config.get('servers.fleetserver'))
      : undefined,
    KIBANA_URL: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
    ENDPOINT_VM_NAME: runnerEnv?.agentVmName,
  };
}
