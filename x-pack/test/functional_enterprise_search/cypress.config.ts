/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

// TODO: If Kibana CI doesn't end up using this (e.g., uses Dockerized containers
// instead of the functional test server), we can opt to delete this file later.

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./base_config'));

  return {
    // default to the xpack functional config
    ...baseConfig.getAll(),

    esTestCluster: {
      ...baseConfig.get('esTestCluster'),
      serverArgs: [
        ...baseConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
      ],
    },

    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        '--enterpriseSearch.host=http://localhost:3002',
      ],
    },
  };
}
