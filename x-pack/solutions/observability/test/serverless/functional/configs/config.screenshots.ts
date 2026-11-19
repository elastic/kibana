/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '@kbn/test-suites-xpack-platform/serverless/functional/config.base';
import { services } from '../services';
import { pageObjects } from '../page_objects';

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
  services,
  pageObjects,
  testFiles: [require.resolve('../test_suites/screenshot_creation')],
  kbnServerArgs: [
    `--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`,
    // Pin the Cases templates flag ON so the case-settings docs screenshots capture
    // the v2 templates / field-library pages regardless of the plugin default.
    `--xpack.cases.templates.enabled=true`,
  ],
  junit: {
    reportName: 'Serverless Observability Screenshot Creation',
  },

  esServerArgs: [],
});
