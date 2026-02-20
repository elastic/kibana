/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Isolate command - mocked data',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.skip('should allow filtering endpoint by Isolated status - requires indexEndpointHosts', async () => {
      // Skipped: requires indexEndpointHosts
    });
  }
);
