/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from './svl_create_test_config';

const apmDebugLogger = {
  name: 'plugins.apm',
  level: 'debug',
  appenders: ['console'],
};

const kibanaConfig = {
  'xpack.spaces.enabled': 'false',
  'logging.loggers': [apmDebugLogger],
};

export default createTestConfig({
  serverlessProject: 'oblt',
  testFiles: [require.resolve('./tests')],
  kibanaConfig,
});
