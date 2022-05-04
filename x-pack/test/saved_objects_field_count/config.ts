/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    testFiles: [require.resolve('./test')],

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: ['path.repo=/tmp/'],
    },

    kbnTestServer: {
      ...kibanaCommonTestsConfig.get('kbnTestServer'),
      serverArgs: [...kibanaCommonTestsConfig.get('kbnTestServer.serverArgs')],
    },

    junit: {
      reportName: 'Saved Object Field Count',
    },
  };
}
