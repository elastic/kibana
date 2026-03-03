/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

interface Settings {
  license: 'basic' | 'trial';
  testFiles: string[];
  name: string;
}

export function createTestConfig(settings: Settings) {
  const { testFiles, license, name } = settings;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('@kbn/test-suites-xpack-platform/api_integration/config')
    );

    return {
      ...xPackAPITestsConfig.getAll(),

      testFiles,
      junit: {
        reportName: name,
      },

      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        license,
      },
    };
  };
}
