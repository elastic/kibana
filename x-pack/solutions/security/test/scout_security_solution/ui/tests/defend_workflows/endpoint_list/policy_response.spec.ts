/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Endpoint policy response',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.skip('should display policy response for endpoint - requires real endpoint with agent id', async () => {
      // Skipped: requires real endpoint agent ID and policy response data
    });
  }
);
