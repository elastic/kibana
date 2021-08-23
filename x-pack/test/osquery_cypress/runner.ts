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

import { ArtifactManager, FetchArtifactsParams } from './artifact_manager';
import { setupUserPermissions } from './osquery_setup';
import { AgentManager } from './setup_agent';
import { FleetManager } from './setup_fleet_server';

interface SetupParams {
  artifacts: FetchArtifactsParams
}

async function setupRunner({getService}: FtrProviderContext, params: SetupParams, runner: (runnerEnv: Record<string, string>) => Promise<void>) {
  const log = getService('log');
  const config = getService('config');

  const artifactManager = new ArtifactManager(
    params.artifacts,
    log
  );
  await artifactManager.fetchArtifacts();

  const esHost = Url.format(config.get('servers.elasticsearch'))
  const fleetManager = new FleetManager(
    artifactManager.getArtifactDirectory('fleet-server'),
    {
      host: esHost,
      user: config.get('servers.elasticsearch.username'),
      password: config.get('servers.elasticsearch.password'),
    },
    log
  );

  const agentManager = new AgentManager(
    artifactManager.getArtifactDirectory('elastic-agent'),
    {
      user: config.get('servers.elasticsearch.username'),
      password: config.get('servers.elasticsearch.password'),
      elasticHost: esHost,
      kibanaUrl: Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      }),
    },
    log
  );
  await fleetManager.setup();
  await agentManager.setup();

  await setupUserPermissions(config);
  const policyId = agentManager.policyId;
  async function cleanup() {
    fleetManager.cleanup();
    agentManager.cleanup()
    await artifactManager.cleanupArtifacts();
  }
  process.on('SIGINT', async () => await cleanup())

  try {
    await runner({
      CYPRESS_OSQUERY_POLICY: policyId 
    })
  } finally {
    log.info('Cleaning up agent and fleet debris')
    await cleanup()
  }
}

export async function OsqueryCypressCliTestRunner(context: FtrProviderContext) {
  const log = context.getService('log');
  const config = context.getService('config');
  await setupRunner(context, {
      artifacts: {
        'elastic-agent': '7.15.0-SNAPSHOT',
        'fleet-server': '7.15.0-SNAPSHOT',
      }
    },
    (runnerEnv) => withProcRunner(log, async (procs) => {
      await procs.run('cypress', {
        cmd: 'yarn',
        args: ['cypress:run'],
        cwd: resolve(__dirname, '../../plugins/osquery'),
        env: {
          FORCE_COLOR: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_baseUrl: Url.format(config.get('servers.kibana')),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_protocol: config.get('servers.kibana.protocol'),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_hostname: config.get('servers.kibana.hostname'),
          CYPRESS_configport: config.get('servers.kibana.port'),
          // eslint-disable-next-line @typescript-eslint/naming-convention
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

export async function OsqueryCypressVisualTestRunner(context: FtrProviderContext) {
  const log = context.getService('log');
  const config = context.getService('config');

  await setupRunner(context, {
      artifacts: {
        'elastic-agent': '7.15.0-SNAPSHOT',
        'fleet-server': '7.15.0-SNAPSHOT',
      }
    },
    (runnerEnv) => withProcRunner(log, async (procs) => {
      await procs.run('cypress', {
        cmd: 'yarn',
        args: ['cypress:open'],
        cwd: resolve(__dirname, '../../plugins/osquery'),
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
