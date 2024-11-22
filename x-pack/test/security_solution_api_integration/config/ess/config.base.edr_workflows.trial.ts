/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { generateConfig } from './config.base.edr_workflows';
import { services } from './services_edr_workflows';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(
    require.resolve('../../../api_integration/config.ts')
  );

  return generateConfig({
    baseConfig: xPackAPITestsConfig,
    junitReportName: 'X-Pack Endpoint API Integration Tests against ESS',
    target: 'ess',
    services,
  });
}
