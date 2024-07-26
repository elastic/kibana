/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../../deployment_agnostic/stateful.config.base';

export default createStatefulTestConfig({
  testFiles: [require.resolve('.')],
  junit: {
    reportName: 'Stateful Observability - Painless lab - API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },

  // extra arguments
  esServerArgs: [],
  kbnServerArgs: [],
});
