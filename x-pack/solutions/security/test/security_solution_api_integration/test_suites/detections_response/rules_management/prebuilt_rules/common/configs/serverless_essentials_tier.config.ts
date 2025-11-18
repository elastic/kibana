/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEssentialsTierTestConfig } from '../../../configs/serverless/rules_management.essentials.config';

export default createEssentialsTierTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Rules Management - Prebuilt Rules (Common) Integration Tests - Serverless Env Essentials Tier',
  },
});
