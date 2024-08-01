/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('./config.cloud.ts'));
  // FTR configuration for cloud testing
  return {
    ...xpackFunctionalConfig.getAll(),
    pageObjects,
    junit: {
      reportName: 'ESS Security Cloud Security Agentless Creating Agent Functional Tests',
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--xpack.fleet.agents.fleet_server.hosts=["https://ftr.kibana:8220"]`,
        `--xpack.fleet.internal.fleetServerStandalone=true`,
        `--xpack.fleet.enableExperimental.0=agentless`,
        `--xpack.fleet.agentless.api.url=http://localhost:8089/agentless-api/api/v1/ess`,
        `--xpack.fleet.agentless.api.tls.certificate=./config/certs/ess-client.crt`,
        `--xpack.fleet.agentless.api.tls.key=./config/certs/ess-client.key`,
        `--xpack.fleet.agentless.api.tls.ca=./config/certs/ca.crt`,
        `--xpack.cloud.id=something-anything`,
      ],
    },
    // load tests in the index file
    testFiles: [require.resolve('./agentless/create_agent.ts')],
  };
}
