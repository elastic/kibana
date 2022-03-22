/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';
import { pageObjects } from './page_objects';

// These "secret" values are intentionally written in the source. We would make the APM server accept anonymous traffic if we could
const APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';

export default async function ({ readConfigFile, log }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  const testFiles = [require.resolve('./tests/playwright')];

  const testBuildId = process.env.BUILDKITE_BUILD_ID ?? `local-${uuid()}`;
  const testJobId = process.env.BUILDKITE_JOB_ID ?? `local-${uuid()}`;
  const executionId = uuid();

  log.info(`👷 BUILD ID ${testBuildId}\nJOB ID ${testJobId}\nEXECUTION ID:${executionId}`);

  return {
    testFiles,
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
      serverArgs: [...functionalConfig.get('kbnTestServer.serverArgs')],
      env: {
        ELASTIC_APM_ACTIVE: process.env.ELASTIC_APM_ACTIVE,
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_GLOBAL_LABELS: Object.entries({
          ftrConfig: `x-pack/test/performance/tests/config.playwright`,
          performancePhase: process.env.TEST_PERFORMANCE_PHASE,
          journeyName: process.env.JOURNEY_NAME,
          testJobId,
        })
          .filter(([, v]) => !!v)
          .reduce((acc, [k, v]) => (acc ? `${acc},${k}=${v}` : `${k}=${v}`), ''),
      },
      // delay shutdown by 15 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 15_000,
    },
  };
}
