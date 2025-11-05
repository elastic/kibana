/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './ftr_provider_context';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/screenshot_creation/config')
  );

  return {
    ...xpackFunctionalConfig.getAll(),
    testFiles: [require.resolve('./apps')],
    services,
    junit: {
      ...xpackFunctionalConfig.get('junit'),
      reportName: 'Chrome Security Solution X-Pack UI Screenshot Creation',
    },
  };
}
