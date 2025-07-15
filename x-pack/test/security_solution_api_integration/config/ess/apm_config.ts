/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';

export const DETECTION_ENGINE_APM_CONFIG = {
  serverUrl: APM_SERVER_URL,
  secretToken: APM_PUBLIC_TOKEN,
  active: 'true',
  contextPropagationOnly: 'false',
  environment: process.env.ELASTIC_APM_ENVIRONMENT || (process.env.CI ? 'ci' : 'development'),
  transactionSampleRate: '1.0',
  // capture request body for both errors and request transactions
  // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-body
  captureBody: 'all',
  // capture request headers
  // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-headers
  captureRequestHeaders: true,
  // request body with bigger size will be trimmed.
  // 300_000 is the default of the APM server.
  // for a body with larger size, we might need to reconfigure the APM server to increase the limit.
  // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#long-field-max-length
  longFieldMaxLength: 300_000,
  globalLabels: {
    performancePhase: process.env.TEST_PERFORMANCE_PHASE,
    branch: process.env.BUILDKITE_BRANCH,
    gitRev: process.env.BUILDKITE_COMMIT,
    ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
  },
};
