/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { FtrConfigProviderContext } from '@kbn/test';

import { TelemetryConfigLabels } from '@kbn/telemetry-plugin/server/config';
import { services } from '../services';
import { pageObjects } from '../page_objects';

// These "secret" values are intentionally written in the source. We would make the APM server accept anonymous traffic if we could
const APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';

export default async function ({ readConfigFile, log }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../functional/config.base.js'));

  const testBuildId = process.env.BUILDKITE_BUILD_ID ?? `local-${uuid()}`;
  const testJobId = process.env.BUILDKITE_JOB_ID ?? `local-${uuid()}`;
  const executionId = uuid();

  log.info(` 👷‍♀️ BUILD ID ${testBuildId}\n 👷 JOB ID ${testJobId}\n 👷‍♂️ EXECUTION ID:${executionId}`);

  const prId = process.env.GITHUB_PR_NUMBER
    ? Number.parseInt(process.env.GITHUB_PR_NUMBER, 10)
    : undefined;

  if (Number.isNaN(prId)) {
    throw new Error('invalid GITHUB_PR_NUMBER environment variable');
  }

  const telemetryLabels: TelemetryConfigLabels = {
    branch: process.env.BUILDKITE_BRANCH,
    ciBuildId: process.env.BUILDKITE_BUILD_ID,
    ciBuildJobId: process.env.BUILDKITE_JOB_ID,
    ciBuildNumber: Number(process.env.BUILDKITE_BUILD_NUMBER) || 0,
    gitRev: process.env.BUILDKITE_COMMIT,
    isPr: prId !== undefined,
    ...(prId !== undefined ? { prId } : {}),
    testJobId,
    testBuildId,
    ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
  };

  return {
    services,
    pageObjects,
    servicesRequiredForTestAnalysis: ['performance'],
    servers: functionalConfig.get('servers'),
    esTestCluster: functionalConfig.get('esTestCluster'),
    apps: functionalConfig.get('apps'),
    screenshots: functionalConfig.get('screenshots'),
    junit: {
      reportName: 'Performance Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--telemetry.optIn=${process.env.TEST_PERFORMANCE_PHASE === 'TEST'}`,
        `--telemetry.labels=${JSON.stringify(telemetryLabels)}`,
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
      ],
      env: {
        ELASTIC_APM_ACTIVE: process.env.TEST_PERFORMANCE_PHASE ? 'true' : 'false',
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        // capture request body for both errors and request transactions
        // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-body
        ELASTIC_APM_CAPTURE_BODY: 'all',
        // capture request headers
        // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-headers
        ELASTIC_APM_CAPTURE_HEADERS: true,
        // request body with bigger size will be trimmed.
        // 300_000 is the default of the APM server.
        // for a body with larger size, we might need to reconfigure the APM server to increase the limit.
        // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#long-field-max-length
        ELASTIC_APM_LONG_FIELD_MAX_LENGTH: 300_000,
        ELASTIC_APM_GLOBAL_LABELS: {
          testJobId,
          testBuildId,
        },
      },
      // delay shutdown by 15 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 15_000,
    },
  };
}
