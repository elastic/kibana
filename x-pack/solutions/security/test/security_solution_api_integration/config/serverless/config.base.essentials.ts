/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { installMockPrebuiltRulesPackage } from '../../test_suites/detections_response/utils';
import { services } from './services';
export interface CreateTestConfigOptions {
  testFiles: string[];
  junit: { reportName: string };
  kbnTestServerArgs?: string[];
  kbnTestServerEnv?: Record<string, string>;
  /**
   * Log message to wait for before initiating tests, defaults to waiting for Kibana status to be `available`.
   * Note that this log message must not be filtered out by the current logging config, for example by the
   * log level. If needed, you can adjust the logging level via `kbnTestServer.serverArgs`.
   */
  kbnTestServerWait?: RegExp;
  indexRefreshInterval?: string | false;
}

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(
      require.resolve('@kbn/test-suites-xpack-platform/serverless/shared/config.base')
    );
    return {
      ...svlSharedConfig.getAll(),
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      services: {
        ...services,
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          '--serverless=security',
          `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
            { product_line: 'security', product_tier: 'essentials' },
            { product_line: 'endpoint', product_tier: 'essentials' },
          ])}`,
          ...(options.kbnTestServerArgs || []),
        ],
        env: {
          ...svlSharedConfig.get('kbnTestServer.env'),
          ...options.kbnTestServerEnv,
        },
        runOptions: {
          ...svlSharedConfig.get('kbnTestServer.runOptions'),
          wait: options.kbnTestServerWait,
        },
      },
      testFiles: options.testFiles,
      junit: options.junit,

      mochaOpts: {
        ...svlSharedConfig.get('mochaOpts'),
        grep: '/^(?!.*@skipInServerless).*@serverless.*/',
        rootHooks: {
          // Some of the Rule Management API endpoints install prebuilt rules package under the hood.
          // Prebuilt rules package installation has been known to be flakiness reason since
          // EPR might be unavailable or the network may have faults.
          // Real prebuilt rules package installation is prevented by
          // installing a lightweight mock package.
          beforeAll: ({ getService }: FtrProviderContext) =>
            installMockPrebuiltRulesPackage({ getService }),
        },
      },
      indexRefreshInterval: options.indexRefreshInterval,
    };
  };
}
