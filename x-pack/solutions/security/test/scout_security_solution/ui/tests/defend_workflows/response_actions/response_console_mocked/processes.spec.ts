/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../../fixtures';

test.describe(
  'Response console mocked - processes command',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.skip('should list processes with mocked response - requires mock', async () => {
      // Skipped: requires mock
    });
  }
);
