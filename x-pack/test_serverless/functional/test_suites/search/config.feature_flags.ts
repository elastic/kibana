/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

/**
 * Make sure to create a MKI deployment with custom Kibana image, that includes feature flags arguments
 * This tests most likely will fail on default MKI project
 */
export default createTestConfig({
  serverlessProject: 'es',
  junit: {
    reportName: 'Serverless Search Feature Flags Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlSearch'] },
  // add feature flags
  kbnServerArgs: [
    `--xpack.cloud.id='ES3_FTR_TESTS:ZmFrZS1kb21haW4uY2xkLmVsc3RjLmNvJGZha2Vwcm9qZWN0aWQuZXMkZmFrZXByb2plY3RpZC5rYg=='`,
    `--xpack.cloud.serverless.project_id='fakeprojectid'`,
    `--xpack.cloud.base_url='https://cloud.elastic.co'`,
    `--xpack.cloud.organization_url='/account/members'`,
    `--xpack.security.roleManagementEnabled=true`,
  ],
  // load tests in the index file
  testFiles: [require.resolve('./index.feature_flags.ts')],

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/esproject/config/elasticsearch.yml
  esServerArgs: ['xpack.security.authc.native_roles.enabled=true'],
});
