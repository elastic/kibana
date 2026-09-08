/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { pageObjects } from '../page_objects';
import { services } from '../services';

export default createTestConfig({
  serverlessProject: 'oblt',
  services,
  pageObjects,
  testFiles: [require.resolve('./index.cases_and_rules.ts')],
  junit: {
    reportName: 'Serverless Observability Cases and Rules Functional Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },

  // include settings from project controller
  esServerArgs: [],
  // Pin the Cases templates flag ON so the Configure suite exercises the v2
  // templates / field-library pages regardless of the plugin default. The flag
  // only affects Cases; the legacy in-page flow is covered by the flag-OFF
  // stateful `configure_legacy.ts` suite.
  kbnServerArgs: [`--xpack.cases.templates.enabled=true`],
});
