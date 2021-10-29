/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import Url from 'url';

import { withProcRunner } from '@kbn/dev-utils';

import { FtrProviderContext } from './ftr_provider_context';

import { AgentManager } from './agent';
import { FleetManager } from './fleet_server';

async function withFleetAgent(
  { getService }: FtrProviderContext,
  runner: (runnerEnv: Record<string, string>) => Promise<void>
) {
  const log = getService('log');
  const config = getService('config');

  const esHost = Url.format(config.get('servers.elasticsearch'));
  const esConfig = {
    user: config.get('servers.elasticsearch.username'),
    password: config.get('servers.elasticsearch.password'),
    esHost,
    port: config.get('servers.elasticsearch.port'),
  };
  const fleetManager = new FleetManager(esConfig, log);

  const agentManager = new AgentManager(
    {
      ...esConfig,
      kibanaUrl: Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      }),
    },
    log
  );

  // Since the managers will create uncaughtException event handlers we need to exit manually
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('Encountered error; exiting after cleanup.', err);
    process.exit(1);
  });

  await agentManager.setup();
  await fleetManager.setup();
  try {
    await runner({});
  } finally {
    fleetManager.cleanup();
    agentManager.cleanup();
  }
}

export async function FleetCypressCliTestRunner(context: FtrProviderContext) {
  await startFleetAgent(context, 'run');
}

export async function FleetCypressVisualTestRunner(context: FtrProviderContext) {
  await startFleetAgent(context, 'open');
}

function startFleetAgent(context: FtrProviderContext, cypressCommand: string) {
  const log = context.getService('log');
  const config = context.getService('config');
  return withFleetAgent(context, (runnerEnv) =>
    withProcRunner(log, async (procs) => {
      await procs.run('cypress', {
        cmd: 'yarn',
        args: [`cypress:${cypressCommand}`],
        cwd: resolve(__dirname, '../../plugins/fleet'),
        env: {
          FORCE_COLOR: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_baseUrl: Url.format(config.get('servers.kibana')),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_protocol: config.get('servers.kibana.protocol'),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_hostname: config.get('servers.kibana.hostname'),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_configport: config.get('servers.kibana.port'),
          CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
          CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
          CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
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
