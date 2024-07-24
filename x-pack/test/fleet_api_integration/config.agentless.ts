/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...baseFleetApiConfig.getAll(),
    kbnTestServer: {
      ...baseFleetApiConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseFleetApiConfig.get('kbnTestServer.serverArgs'),
        '--xpack.fleet.agentless.enabled=true',
        '--xpack.fleet.agentless.api.url=http://localhost:5601/api/ingest_manager',
        '--xpack.fleet.agentless.api.tls.certificate=../certs/kibana.crt',
        '--xpack.fleet.agentless.api.tls.key=../certs/kibana.key',
        '--xpack.fleet.agentless.api.tls.ca=../certs/ca.crt',
      ],
    },
    testFiles: [require.resolve('./apis/agentless')],
    junit: {
      reportName: 'X-Pack Fleet Agentless API Integration Tests',
    },
  };
}
