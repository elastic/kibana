/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext, kbnTestConfig, kibanaTestUser } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { services as baseServices } from './services';
import { PRECONFIGURED_ACTION_CONNECTORS } from '../shared';

interface CreateTestConfigOptions {
  license: string;
  ssl?: boolean;
  services?: any;
}

// test.not-enabled is specifically not enabled
const enabledActionTypes = [
  '.cases',
  '.email',
  '.index',
  '.pagerduty',
  '.swimlane',
  '.server-log',
  '.servicenow',
  '.slack',
  '.webhook',
  'test.authorization',
  'test.failing',
  'test.index-record',
  'test.noop',
  'test.rate-limit',
];

export function createTestConfig(options: CreateTestConfigOptions, testFiles?: string[]) {
  const { license = 'trial', ssl = false, services = baseServices } = options;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackApiIntegrationTestsConfig = await readConfigFile(
      require.resolve('../../../api_integration/config.ts')
    );
    const servers = {
      ...xPackApiIntegrationTestsConfig.get('servers'),
      elasticsearch: {
        ...xPackApiIntegrationTestsConfig.get('servers.elasticsearch'),
        protocol: ssl ? 'https' : 'http',
      },
    };

    return {
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      testFiles,
      servers,
      services,
      junit: {
        reportName: 'X-Pack Security Solution API Integration Tests',
      },
      esTestCluster: {
        ...xPackApiIntegrationTestsConfig.get('esTestCluster'),
        license,
        ssl,
        serverArgs: [`xpack.license.self_generated.type=${license}`],
      },
      kbnTestServer: {
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
        env: {
          ELASTICSEARCH_USERNAME: kbnTestConfig.getUrlParts(kibanaTestUser).username,
        },
        serverArgs: [
          ...xPackApiIntegrationTestsConfig.get('kbnTestServer.serverArgs'),
          `--xpack.actions.allowedHosts=${JSON.stringify(['localhost', 'some.non.existent.com'])}`,
          `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
          '--xpack.eventLog.logEntries=true',
          `--xpack.securitySolution.alertIgnoreFields=${JSON.stringify([
            'testing_ignored.constant',
            '/testing_regex*/',
          ])}`, // See tests within the file "ignore_fields.ts" which use these values in "alertIgnoreFields"
          '--xpack.ruleRegistry.write.enabled=true',
          '--xpack.ruleRegistry.write.cache.enabled=false',
          '--xpack.ruleRegistry.unsafe.indexUpgrade.enabled=true',
          '--xpack.ruleRegistry.unsafe.legacyMultiTenancy.enabled=true',
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'previewTelemetryUrlEnabled',
            'riskScoringPersistence',
            'riskScoringRoutesEnabled',
            'alertSuppressionForSequenceEqlRuleEnabled',
          ])}`,
          `--plugin-path=${path.resolve(
            __dirname,
            '../../../../../test/analytics/plugins/analytics_ftr_helpers'
          )}`,

          '--xpack.task_manager.poll_interval=1000',
          `--xpack.actions.preconfigured=${JSON.stringify(PRECONFIGURED_ACTION_CONNECTORS)}`,
          ...(ssl
            ? [
                `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
                `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
              ]
            : []),
        ],
      },
      mochaOpts: {
        grep: '/^(?!.*@skipInEss).*@ess.*/',
      },
    };
  };
}
