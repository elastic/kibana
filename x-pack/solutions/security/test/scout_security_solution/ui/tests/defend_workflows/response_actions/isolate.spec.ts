/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Isolate command',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.describe('from Manage', () => {
      test.skip('should allow filtering endpoint by Isolated status - requires indexEndpointHosts', async () => {
        // Skipped: requires indexEndpointHosts with isolation: true/false
      });
    });

    test.describe.skip('from Alerts', () => {
      test('should isolate and release host - skipped: @brokenInServerless', () => {});
    });

    test.describe.skip('from Cases', () => {
      test('should isolate and release host - skipped: TODO re-enable when security-team#9625 merged', () => {});
    });
  }
);
