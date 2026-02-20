/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Endpoints RBAC - empty state mocked data',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test('should show empty state for viewer role', async ({ page, browserAuth }) => {
      await browserAuth.loginWithCustomRole({
        kibana: [{ base: [], feature: { siem: ['minimal_read'] }, spaces: ['*'] }],
      });
      await page.goto('/app/security/administration/endpoints');
      await expect(page.locator('text=Hosts running Elastic Defend').first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test.skip('should show empty state with no policies for endpoint_all role - requires SAML/custom role setup', async () => {
      // Skipped: requires specific RBAC role setup
    });
  }
);
