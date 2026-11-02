/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const searchFunctionalConfig = await readConfigFile(require.resolve('../config'));

  return {
    ...searchFunctionalConfig.getAll(),
    junit: {
      reportName: 'Search Solution Functional Tests - Basic License',
    },
    esTestCluster: {
      ...searchFunctionalConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        'xpack.license.self_generated.type=basic',
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
      ],
    },
    testFiles: [require.resolve('../index.basic.ts')],
  };
}
