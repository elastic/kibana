/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

const enabledActionTypes = [
  '.cases-webhook',
  '.index',
  '.jira',
  '.resilient',
  '.server-log',
  '.servicenow',
  '.servicenow-itom',
  '.servicenow-sir',
  '.swimlane',
  '.thehive',
];

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./screenshot_creation')],
  kbnServerArgs: [`--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`],
  junit: {
    reportName: 'Serverless Observability Screenshot Creation',
  },

  esServerArgs: ['xpack.ml.ad.enabled=false', 'xpack.ml.dfa.enabled=false'],
});
