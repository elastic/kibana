/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { DEFEND_WORKFLOWS_ROUTES } from '../../fixtures';

spaceTest.describe(
  'Defend Workflows - endpoints',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest('loads endpoint list with hosts', async ({ page }) => {
      await page.goto(DEFEND_WORKFLOWS_ROUTES.endpoints);
      await page
        .locator(testSubjSelector('globalLoadingIndicator-hidden'))
        .waitFor({ state: 'visible' });
      await expect(page.locator(testSubjSelector('endpointPage'))).toBeVisible();
      await expect(page.locator(testSubjSelector('endpointListTable'))).toBeVisible();
    });
  }
);
