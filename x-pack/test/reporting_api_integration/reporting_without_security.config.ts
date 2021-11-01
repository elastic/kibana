/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const apiConfig = await readConfigFile(require.resolve('./reporting_and_security.config'));

  return {
    ...apiConfig.getAll(),
    junit: { reportName: 'X-Pack Reporting API Integration Tests Without Security Enabled' },
    testFiles: [require.resolve('./reporting_without_security')],
    esTestCluster: {
      ...apiConfig.get('esTestCluster'),
      serverArgs: [
        ...apiConfig.get('esTestCluster.serverArgs'),
        'node.name=UnsecuredClusterNode01',
        'xpack.security.enabled=false',
      ],
    },
    kbnTestServer: {
      ...apiConfig.get('kbnTestServer'),
      serverArgs: [...apiConfig.get('kbnTestServer.serverArgs')],
    },
  };
}
