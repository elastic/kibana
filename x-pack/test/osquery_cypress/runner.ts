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

import {ArtifactManager} from './artifact_manager'
import {setupUserPermissions} from './osquery_setup'
import { AgentManager } from './setup_agent';
import { FleetManager } from './setup_fleet_server';
import axios from 'axios';

export async function OsqueryCypressCliTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');

  console.log(Url.format(config.get('servers.elasticsearch')))
  await axios.post('http://localhost:9220/_security/user/fleet-server', {password:'changeme', roles:['superuser']}, {auth:{username: 'elastic', password: 'changeme'}})
  const artifactManager = new ArtifactManager({
    'elastic-agent': '7.14.0-SNAPSHOT',
    'fleet-server': '7.14.0-SNAPSHOT'
  }, log)
  await artifactManager.fetchArtifacts()

  const fleetManager = new FleetManager(artifactManager.getArtifactDirectory('fleet-server'), {
    host: Url.format(config.get('servers.elasticsearch')),
    user: config.get('servers.elasticsearch.username'),
    password: config.get('servers.elasticsearch.password'),
  }, log);

  const agentManager = new AgentManager(artifactManager.getArtifactDirectory('elastic-agent'), {
    user: config.get('servers.elasticsearch.username'),
    password: config.get('servers.elasticsearch.password'),
    kibanaUrl:
     Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }
    ),
  }, log)
  await fleetManager.setup();
  await agentManager.setup()

  await setupUserPermissions(config);

  await withProcRunner(log, async (procs) => {
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
        ...process.env,
      },
      wait: true,
    });
  });
  fleetManager.cleanup();
  await artifactManager.cleanupArtifacts();
}

export async function OsqueryCypressVisualTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');

  await withProcRunner(log, async (procs) => {
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
        ...process.env,
      },
      wait: true,
    });
  });
}
