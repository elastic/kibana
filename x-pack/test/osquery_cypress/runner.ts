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
import { getLatestAvailableAgentVersion } from '../defend_workflows_cypress/utils';

async function withFleetAgent(
  { getService }: FtrProviderContext,
  runner: (runnerEnv: Record<string, string>) => Promise<void>
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

  const fleetManager = new FleetManager(kbnClient, log);
  const agentManager = new AgentManager(kbnClient, log);

  await fleetManager.setup();
  await agentManager.setup();
  try {
    await runner({});
  } finally {
    agentManager.cleanup();
    fleetManager.cleanup();
  }
}

export async function OsqueryCypressCliTestRunner(context: FtrProviderContext) {
  await startOsqueryCypress(context, 'run');
}

export async function OsqueryCypressVisualTestRunner(context: FtrProviderContext) {
  await startOsqueryCypress(context, 'open');
}

function startOsqueryCypress(context: FtrProviderContext, cypressCommand: string) {
  const log = context.getService('log');
  const config = context.getService('config');
  return withFleetAgent(context, (runnerEnv) =>
    withProcRunner(log, async (procs) => {
      await procs.run('cypress', {
        cmd: 'yarn',
        args: [`cypress:${cypressCommand}`],
        cwd: resolve(__dirname, '../../plugins/osquery'),
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
          ...runnerEnv,
          ...process.env,
        },
        wait: true,
      });
    })
  );
}
