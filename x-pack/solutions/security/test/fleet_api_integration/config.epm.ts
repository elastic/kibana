/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/fleet_api_integration/config.base')
  );
  const baseConfig = baseFleetApiConfig.getAll();

  return {
    ...baseConfig,
    testFiles: [require.resolve('./apis/epm')],
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        // Upload fixtures in this suite share registry package names.
        `--xpack.fleet.internal.allowRegistryPackageUploads=true`,
      ],
    },
    junit: {
      reportName: 'X-Pack Security Solution EPM API Integration Tests',
    },
  };
}
