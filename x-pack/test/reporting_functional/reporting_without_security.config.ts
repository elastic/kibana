/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const reportingConfig = await readConfigFile(require.resolve('./reporting_and_security.config'));

  return {
    ...reportingConfig.getAll(),
    junit: { reportName: 'X-Pack Reporting Functional Tests Without Security Enabled' },
    testFiles: [resolve(__dirname, './reporting_without_security')],
    kbnTestServer: {
      ...reportingConfig.get('kbnTestServer'),
      serverArgs: [...reportingConfig.get('kbnTestServer.serverArgs')],
    },
    esTestCluster: {
      ...reportingConfig.get('esTestCluster'),
      serverArgs: [
        ...reportingConfig.get('esTestCluster.serverArgs'),
        'node.name=UnsecuredClusterNode01',
        'xpack.security.enabled=false',
      ],
    },
  };
}
