/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';

import { FtrConfigProviderContext } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrProviderContext } from '../../ftr_provider_context';
import { installMockPrebuiltRulesPackage } from '../../test_suites/detections_response/utils';
import { PRECONFIGURED_ACTION_CONNECTORS } from '../shared';
import { services } from './services';

export interface CreateTestConfigOptions {
  testFiles: string[];
  junit: { reportName: string };
  kbnTestServerArgs?: string[];
  kbnTestServerEnv?: Record<string, string>;
  suiteTags?: { include?: string[]; exclude?: string[] };
}

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const svlSharedConfig = await readConfigFile(
      require.resolve('@kbn/test-suites-serverless/shared/config.base')
    );
    return {
      ...svlSharedConfig.getAll(),
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      suiteTags: options.suiteTags,
      services: {
        ...services,
      },
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          '--serverless=security',
          `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_ACTION_CONNECTORS)}`,
          ...(options.kbnTestServerArgs || []),
          `--plugin-path=${path.resolve(
            __dirname,
            '../../../../../test/analytics/plugins/analytics_ftr_helpers'
          )}`,
        ],
        env: {
          ...svlSharedConfig.get('kbnTestServer.env'),
          ...options.kbnTestServerEnv,
        },
      },
      testFiles: options.testFiles,
      junit: options.junit,

      mochaOpts: {
        ...svlSharedConfig.get('mochaOpts'),
        grep: '/^(?!.*(^|\\s)@skipInServerless(\\s|$)).*@serverless.*/',
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
    };
  };
}
