/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../config.base';

const enabledActionTypes = ['.index'];

export default createTestConfig({
  serverlessProject: 'es',
  testFiles: [require.resolve('./screenshot_creation')],
  kbnServerArgs: [`--xpack.actions.enabledActionTypes=${JSON.stringify(enabledActionTypes)}`],
  junit: {
    reportName: 'Serverless Search Screenshot Creation',
  },

  // include settings from project controller
  // https://github.com/elastic/project-controller/blob/main/internal/project/esproject/config/elasticsearch.yml
  esServerArgs: [],
});
