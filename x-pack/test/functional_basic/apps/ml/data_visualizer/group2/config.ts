/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../../../../../functional/config.base.js')
  );

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        'xpack.license.self_generated.type=basic',
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
      ],
    },
    testFiles: [require.resolve('.')],
    junit: {
      ...xpackFunctionalConfig.get('junit'),
      reportName: 'Chrome X-Pack UI Functional Tests Basic License - data visualizer',
    },
  };
}
