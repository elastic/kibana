/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';
import { pageObjects } from './page_objects';

// These "secret" values are intentionally written in the source. We would make the APM server accept anonymous traffic if we could
const APM_SERVER_URL = 'https://2fad4006bf784bb8a54e52f4a5862609.apm.us-west1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'Q5q5rWQEw6tKeirBpw';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  const testFiles = [
    require.resolve('./tests/playwright/home.ts'),
    // require.resolve('./tests/playwright/flight_dashboard.ts'),
  ];

  return {
    testFiles,
    services,
    pageObjects,
    servicesRequiredForTestAnalysis: ['playwright'],
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
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
        '--xpack.encryptedSavedObjects.encryptionKey="DkdXazszSCYexXqz4YktBGHCRkV6hyNK"',
        '--xpack.security.session.idleTimeout=1Y',
        '--xpack.security.session.lifespan=1Y',
        '--xpack.security.session.cleanupInterval=1Y',
      ],
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
        })
          .filter(([, v]) => !!v)
          .reduce((acc, [k, v]) => (acc ? `${acc},${k}=${v}` : `${k}=${v}`), ''),
      },
      // delay shutdown by 15 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 15_000,
    },
  };
}
