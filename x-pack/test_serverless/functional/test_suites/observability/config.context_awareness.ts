/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('../common/discover/context_awareness')],
  junit: {
    reportName: 'Serverless Observability Discover Context Awareness Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  kbnServerArgs: [
    `--discover.experimental.enabledProfiles=${JSON.stringify([
      'example-root-profile',
      'example-solution-view-root-profile',
      'example-data-source-profile',
      'example-document-profile',
    ])}`,
  ],
  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/observability/config/elasticsearch.yml
  esServerArgs: ['xpack.ml.dfa.enabled=false'],
});
