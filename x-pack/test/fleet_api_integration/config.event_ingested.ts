/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));
  const serverArgs: string[] = [
    ...baseFleetApiConfig.get('kbnTestServer.serverArgs'),
    // serverless oblt needs only event.ingested, without agent id verification
    `--xpack.fleet.agentIdVerificationEnabled=false`,
    `--xpack.fleet.eventIngestedEnabled=true`,
  ];

  return {
    ...baseFleetApiConfig.getAll(),
    kbnTestServer: {
      ...baseFleetApiConfig.get('kbnTestServer'),
      serverArgs,
    },
    testFiles: [require.resolve('./apis/event_ingested')],
    junit: {
      reportName: 'X-Pack Event Ingested API Integration Tests',
    },
  };
}
