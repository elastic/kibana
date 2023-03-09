/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import Url from 'url';
import { withProcRunner } from '@kbn/dev-proc-runner';
import { startRuntimeServices } from '@kbn/security-solution-plugin/scripts/endpoint/endpoint_agent_runner/runtime';
import { FtrProviderContext } from './ftr_provider_context';
import { AgentManager } from './agent';
import { FleetManager } from './fleet_server';
import { getLatestAvailableAgentVersion } from './utils';

type RunnerEnv = Record<string, string | undefined>;

async function withFleetAgent(
  { getService }: FtrProviderContext,
  runner: (runnerEnv: RunnerEnv) => Promise<void>
) {
  const log = getService('log');
  const config = getService('config');
  const kbnClient = getService('kibanaServer');

  const elasticUrl = Url.format(config.get('servers.elasticsearch'));
  const kibanaUrl = Url.format(config.get('servers.kibana'));
  const username = config.get('servers.elasticsearch.username');
  const password = config.get('servers.elasticsearch.password');

  await startRuntimeServices({
    log,
    elasticUrl,
    kibanaUrl,
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
  await startDefendWorkflowsCypress(context, 'dw:run');
}

export async function DefendWorkflowsCypressVisualTestRunner(context: FtrProviderContext) {
  await startDefendWorkflowsCypress(context, 'dw:open');
}

export async function DefendWorkflowsCypressEndpointTestRunner(context: FtrProviderContext) {
  await withFleetAgent(context, (runnerEnv) =>
    startDefendWorkflowsCypress(context, 'dw:endpoint:open', runnerEnv)
  );
}

function startDefendWorkflowsCypress(
  context: FtrProviderContext,
  cypressCommand: 'dw:endpoint:open' | 'dw:open' | 'dw:run',
  runnerEnv?: RunnerEnv
) {
  const log = context.getService('log');
  const config = context.getService('config');
  return withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [`cypress:${cypressCommand}`],
      cwd: resolve(__dirname, '../../plugins/security_solution'),
      env: {
        FORCE_COLOR: '1',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_baseUrl: Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        }),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_protocol: config.get('servers.kibana.protocol'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_hostname: config.get('servers.kibana.hostname'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_configport: config.get('servers.kibana.port'),
        CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
        CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.kibana.username'),
        CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.kibana.password'),
        CYPRESS_KIBANA_URL: Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        }),
        CYPRESS_ENDPOINT_VM_NAME: runnerEnv?.agentVmName,
        ...process.env,
      },
      wait: true,
    });
  });
}
