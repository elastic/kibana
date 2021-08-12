/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';
import { pageObjects } from './page_objects';

// These "secret" values are intentionally written in the source. We would make the APM server accept annonymous traffic if we could
const APM_SERVER_URL = 'https://2fad4006bf784bb8a54e52f4a5862609.apm.us-west1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'Q5q5rWQEw6tKeirBpw';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    testFiles: [require.resolve('./tests/index.ts')],
    services,
    pageObjects,
    servers: functionalConfig.get('servers'),
    esTestCluster: functionalConfig.get('esTestCluster'),
    apps: functionalConfig.get('apps'),
    screenshots: functionalConfig.get('screenshots'),
    junit: {
      reportName: 'Performance Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      env: {
        ELASTIC_APM_ACTIVE: 'true',
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_GLOBAL_LABELS: Object.entries({
          ftrConfig: `x-pack/test/performance`,
          jenkinsJobName: process.env.JOB_NAME,
          jenkinsBuildNumber: process.env.BUILD_NUMBER,
          prId: process.env.PR_NUMBER,
          branch: process.env.GIT_BRANCH,
          commit: process.env.GIT_COMMIT,
          mergeBase: process.env.PR_MERGE_BASE,
          targetBranch: process.env.PR_TARGET_BRANCH,
        })
          .filter(([, v]) => !!v)
          .reduce((acc, [k, v]) => (acc ? `${acc},${k}=${v}` : `${k}=${v}`), ''),
      },
      // delay shutdown by 15 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 15_000,
    },
  };
}
