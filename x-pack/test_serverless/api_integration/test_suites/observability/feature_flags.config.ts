/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../shared/config/oblt.feature_flags.config';
import { services } from './apm_api_integration/common/services';

export default createTestConfig({
  testFiles: [require.resolve('./threshold_rule/index.ts')],
  junit: {
    reportName: 'Serverless Observability + Feature Flags API Integration Tests',
  },
  suiteTags: { exclude: ['skipSvlOblt'] },
  services,
});
