/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Endpoint list with Security Essentials',
  { tag: [...tags.serverless.security.essentials] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.skip('should display endpoint list for Security Essentials tier - serverless only', async () => {
      // Skipped: serverless-specific feature access
    });
  }
);
