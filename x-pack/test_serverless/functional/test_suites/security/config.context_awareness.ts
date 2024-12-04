/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'security',
  testFiles: [require.resolve('./ftr/one_discover/context_awareness')],
  junit: {
    reportName:
      'Serverless Security Discover Context Awareness Functional Tests - Security Profiles',
  },
  kbnServerArgs: [
    `--discover.experimental.enabledProfiles=${JSON.stringify(['security-root-profile'])}`,
  ],
  // include settings from project controller
  // https://github.com/elastic/elasticsearch-controller/blob/main/helm/values.yaml
  esServerArgs: ['xpack.ml.dfa.enabled=false'],
});
