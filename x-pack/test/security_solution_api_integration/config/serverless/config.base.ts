/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import {
  FtrConfigProviderContext,
  fleetPackageRegistryDockerImage,
  defineDockerServersConfig,
} from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { PRECONFIGURED_ACTION_CONNECTORS } from '../shared';
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
  suiteTags?: { include?: string[]; exclude?: string[] };
}

export function createTestConfig(options: CreateTestConfigOptions) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const packageRegistryConfig = path.join(__dirname, './package_registry_config.yml');
    const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];
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
      dockerServers: defineDockerServersConfig({
        registry: {
          enabled: true,
          image: fleetPackageRegistryDockerImage,
          portInContainer: 8080,
          port: 8081,
          args: dockerArgs,
          waitForLogLine: 'package manifests loaded',
          waitForLogLineTimeoutMs: 60 * 4 * 1000, // 4 minutes
        },
      }),
      kbnTestServer: {
        ...svlSharedConfig.get('kbnTestServer'),
        serverArgs: [
          ...svlSharedConfig.get('kbnTestServer.serverArgs'),
          '--serverless=security',
          `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_ACTION_CONNECTORS)}`,
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'bulkEditAlertSuppressionEnabled',
            'doesNotMatchForIndicatorMatchRuleEnabled',
          ])}`,
          ...(options.kbnTestServerArgs || []),
          `--plugin-path=${path.resolve(
            __dirname,
            '../../../../../src/platform/test/analytics/plugins/analytics_ftr_helpers'
          )}`,
          '--xpack.fleet.registryUrl=http://localhost:8081',
          `--logging.loggers=${JSON.stringify([
            {
              name: 'plugins.securitySolution',
              level: 'debug',
            },
            {
              name: 'plugins.fleet',
              level: 'debug',
            },
          ])}`,
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
    };
  };
}
