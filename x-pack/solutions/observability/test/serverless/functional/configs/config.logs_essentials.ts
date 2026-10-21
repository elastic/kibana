/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { services } from '../services';
import { pageObjects } from '../page_objects';

export default createTestConfig({
  serverlessProject: 'oblt',
  services,
  pageObjects,
  testFiles: [require.resolve('./index.logs_essentials.ts')],
  junit: {
    reportName: 'Serverless Observability Logs Essentials Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },

  // include settings from elasticsearch controller
  esServerArgs: [
    // logs essentials tier configuration
    'serverless.project_type=observability',
    'serverless.observability.tier=logs_essentials',
  ],
  kbnServerArgs: [
    '--xpack.dataUsage.enabled=true',
    '--xpack.dataUsage.enableExperimental=[]',
    // dataUsage.autoops* config is set in kibana controller
    '--xpack.dataUsage.autoops.enabled=true',
    '--xpack.dataUsage.autoops.api.url=http://localhost:9000',
    `--xpack.dataUsage.autoops.api.tls.certificate=${KBN_CERT_PATH}`,
    `--xpack.dataUsage.autoops.api.tls.key=${KBN_KEY_PATH}`,
    `--pricing.tiers.products=${JSON.stringify([
      { name: 'observability', tier: 'logs_essentials' },
    ])}`,
  ],
});
