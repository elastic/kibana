/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { withUiamCertOfProject } from '@kbn/test-suites-xpack-platform/serverless/shared/uiam_cert';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlSharedConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack-platform/serverless/shared/config.base')
  );

  return {
    ...svlSharedConfig.getAll(),
    esTestCluster: {
      ...svlSharedConfig.get('esTestCluster'),
      serverArgs: [
        ...svlSharedConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
      ],
    },
    kbnTestServer: {
      ...svlSharedConfig.get('kbnTestServer'),
      serverArgs: [
        ...withUiamCertOfProject(svlSharedConfig.get('kbnTestServer.serverArgs'), 'security'),
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        '--serverless=security',
      ],
    },
    uiSettings: {
      globalDefaults: {
        hideAnnouncements: true,
      },
    },
  };
}
