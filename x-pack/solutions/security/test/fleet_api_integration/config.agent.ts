/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/fleet_api_integration/config.base')
  );

  return {
    ...baseFleetApiConfig.getAll(),
    testFiles: [require.resolve('./apis/agents')],
    junit: {
      reportName: 'X-Pack Security Solution Fleet Agent API Integration Tests',
    },
  };
}
