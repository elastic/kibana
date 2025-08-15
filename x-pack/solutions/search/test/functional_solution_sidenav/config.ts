/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects, services } from './ftr_provider_context';

/**
 * NOTE: The solution view is currently only available in the cloud environment.
 * This test suite fakes a cloud environement by setting the cloud.id and cloud.base_url
 */

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/functional/config.base')
  );

  return {
    ...functionalConfig.getAll(),
    services,
    pageObjects,
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [...functionalConfig.get('kbnTestServer.serverArgs')],
    },
  };
}
