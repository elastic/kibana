/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { testRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    testRunner,

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: ['path.repo=/tmp/'],
    },

    kbnTestServer: {
      ...kibanaCommonTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonTestsConfig.get('kbnTestServer.serverArgs'),
        // Enable plugins that are disabled by default to include their metrics
        // TODO: Find a way to automatically enable all discovered plugins
        '--xpack.ingestManager.enabled=true',
        '--xpack.lists.enabled=true',
        '--xpack.securitySolution.enabled=true',
      ],
    },
  };
}
