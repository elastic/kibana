/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { SecuritySolutionConfigurableCypressTestRunner } from './runner';

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
        ...svlSharedConfig.get('kbnTestServer.serverArgs'),
        '--serverless=security',
        '--xpack.encryptedSavedObjects.encryptionKey="abcdefghijklmnopqrstuvwxyz123456"',
        `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
          { product_line: 'cloud', product_tier: 'complete' },
        ])}`,
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        '--xpack.fleet.agentless.enabled=true',
      ],
      runOptions: {
        wait: FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP,
      },
    },
    testRunner: SecuritySolutionConfigurableCypressTestRunner,
  };
}

/**
 * A log message indicating that Fleet plugin has completed any necessary setup logic
 * to make sure test suites can run without race conditions with Fleet plugin initialization.
 *
 * The message must not be filtered out by the logging configuration. Subsequently higher log level is better.
 * "Fleet setup completed" has the same "info" level as "Kibana server is ready" log message.
 */
const FLEET_PLUGIN_READY_LOG_MESSAGE_REGEXP = /Fleet setup completed/;
