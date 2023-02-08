/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'node:os';
import { find } from 'lodash';
import { FtrConfigProviderContext } from '@kbn/test';

import { DefendWorkflowsCypressMultipassTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const defendWorkflowsCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  const config = defendWorkflowsCypressConfig.getAll();
  const hostIp = find(os.networkInterfaces().en0, { family: 'IPv4' })?.address ?? '0.0.0.0';
  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      serverArgs: [
        ...config.kbnTestServer.serverArgs,
        `--xpack.fleet.agents.fleet_server.hosts=["https://${hostIp}:8220"]`,
        `--xpack.fleet.agents.elasticsearch.host=http://${hostIp}:${defendWorkflowsCypressConfig.get(
          'servers.elasticsearch.port'
        )}`,
      ],
    },
    testRunner: DefendWorkflowsCypressMultipassTestRunner,
  };
}
