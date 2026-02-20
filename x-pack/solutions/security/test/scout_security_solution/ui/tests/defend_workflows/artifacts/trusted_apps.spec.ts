/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Trusted Apps',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.describe('Renders Trusted Apps form fields', () => {
      test('Correctly renders all blocklist fields for different OSs', async ({
        page,
        pageObjects,
      }) => {
        await pageObjects.artifacts.goto('trustedApps', { create: true });
        await pageObjects.artifacts.waitForPage('trustedApps');
        await expect(
          page.locator('[data-test-subj^="trustedAppsListPage"]').first()
        ).toBeVisible();
        const osSelector = page.locator('[data-test-subj*="os"], select, [role="combobox"]').first();
        if (await osSelector.isVisible()) {
          await osSelector.click();
        }
        await expect(page.getByText('Windows').first()).toBeVisible();
        await expect(page.getByText('Mac').first()).toBeVisible();
        await expect(page.getByText('Linux').first()).toBeVisible();
      });
    });

    test.describe('Handles CRUD with signature field', () => {
      test.skip('Correctly creates a trusted app - requires createPerPolicyArtifact API', async () => {
        // Skipped: requires createAgentPolicyTask + createPerPolicyArtifact
      });
    });
  }
);
