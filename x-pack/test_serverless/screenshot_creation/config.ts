/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlSharedConfig = await readConfigFile(require.resolve('../shared/config.base.ts'));

  return {
    // default to the functional config
    ...svlSharedConfig.getAll(),
    pageObjects,
    services,
    testFiles: [require.resolve('./apps')],
    junit: {
      ...svlSharedConfig.get('junit'),
      reportName: 'Chrome X-Pack UI Screenshot Creation',
    },
    esTestCluster: {
      ...svlSharedConfig.get('esTestCluster'),
      serverArgs: [...svlSharedConfig.get('esTestCluster.serverArgs')],
    },
    kbnTestServer: {
      ...svlSharedConfig.get('kbnTestServer'),
      serverArgs: [...svlSharedConfig.get('kbnTestServer.serverArgs'), '--serverless=es'],
    },
  };
}
