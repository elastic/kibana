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
import { DETECTION_ENGINE_APM_CONFIG } from './apm_config';

interface CreateTestConfigOptions {
  license: string;
  ssl?: boolean;
  services?: any;
  // Used to enable searchable snapshots locally which is necessary to run tests on the frozen data tier
  // see https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots
  esSnapshotStorageConfig?: { size: `${number}GB`; path: string };
  // How often index lifecycle management checks for indices that meet policy criteria. Defaults to 10m.
  // See https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-lifecycle-management-settings
  ilmPollInterval?: `${number}${'s' | 'm'}`;
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
  const {
    license = 'trial',
    ssl = false,
    services = baseServices,
    esSnapshotStorageConfig,
    ilmPollInterval,
  } = options;

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
        serverArgs: [
          `xpack.license.self_generated.type=${license}`,
          ...(esSnapshotStorageConfig
            ? [
                `path.repo=${esSnapshotStorageConfig.path}`,
                `xpack.searchable.snapshot.shared_cache.size=${esSnapshotStorageConfig.size}`,
              ]
            : []),
          ...(ilmPollInterval ? [`indices.lifecycle.poll_interval=${ilmPollInterval}`] : []),
        ],
      },
      kbnTestServer: {
        ...xPackApiIntegrationTestsConfig.get('kbnTestServer'),
        env: {
          ELASTICSEARCH_USERNAME: kbnTestConfig.getUrlParts(kibanaTestUser).username,
          ELASTIC_APM_ACTIVE: DETECTION_ENGINE_APM_CONFIG.active,
          ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: DETECTION_ENGINE_APM_CONFIG.contextPropagationOnly,
          ELASTIC_APM_ENVIRONMENT: DETECTION_ENGINE_APM_CONFIG.environment,
          ELASTIC_APM_TRANSACTION_SAMPLE_RATE: DETECTION_ENGINE_APM_CONFIG.transactionSampleRate,
          ELASTIC_APM_SERVER_URL: DETECTION_ENGINE_APM_CONFIG.serverUrl,
          ELASTIC_APM_SECRET_TOKEN: DETECTION_ENGINE_APM_CONFIG.secretToken,
          ELASTIC_APM_CAPTURE_BODY: DETECTION_ENGINE_APM_CONFIG.captureBody,
          ELASTIC_APM_CAPTURE_HEADERS: DETECTION_ENGINE_APM_CONFIG.captureRequestHeaders,
          ELASTIC_APM_LONG_FIELD_MAX_LENGTH: DETECTION_ENGINE_APM_CONFIG.longFieldMaxLength,
          ELASTIC_APM_GLOBAL_LABELS: Object.entries({
            ...DETECTION_ENGINE_APM_CONFIG.globalLabels,
          })
            .flatMap(([key, value]) => (value == null ? [] : `${key}=${value}`))
            .join(','),
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
            'bulkEditAlertSuppressionEnabled',
          ])}`,
          `--plugin-path=${path.resolve(
            __dirname,
            '../../../../../src/platform/test/analytics/plugins/analytics_ftr_helpers'
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
