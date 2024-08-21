/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { SecuritySolutionConfigurableCypressTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const svlSharedConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-serverless/shared/config.base')
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
        ...svlSharedConfig.get('kbnTestServer.serverArgs'),
        '--serverless=security',
        '--xpack.encryptedSavedObjects.encryptionKey="abcdefghijklmnopqrstuvwxyz123456"',
        `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
          { product_line: 'cloud', product_tier: 'complete' },
        ])}`,
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(['manualRuleRunEnabled'])}`,
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
      ],
    },
    testRunner: SecuritySolutionConfigurableCypressTestRunner,
  };
}
