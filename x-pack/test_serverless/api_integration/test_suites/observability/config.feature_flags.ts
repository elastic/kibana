/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';
import { services } from './apm_api_integration/common/services';

/**
 * Make sure to create a MKI deployment with custom Kibana image, that includes feature flags arguments
 * This tests most likely will fail on default MKI project
 */
export default createTestConfig({
  serverlessProject: 'oblt',
  junit: {
    reportName: 'Serverless Observability Feature Flags API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  services,
  // add feature flags
  kbnServerArgs: [
    '--xpack.infra.enabled=true',
    '--xpack.security.roleManagementEnabled=true', // enables custom roles
    `--xpack.spaces.maxSpaces=100`, // enables spaces UI capabilities
  ],
  // load tests in the index file
  testFiles: [require.resolve('./index.feature_flags.ts')],

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false', 'xpack.security.authc.native_roles.enabled=true'],
});
