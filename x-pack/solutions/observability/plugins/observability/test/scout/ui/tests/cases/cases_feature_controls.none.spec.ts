/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { NO_CASES_ROLE } from '../../fixtures/roles';

// Ported from the "no observability privileges" suite in the FTR
// feature_controls/observability_security.ts. A user without Observability or
// Cases privileges cannot access the Observability app at all.
test.describe('Observability cases - no privileges', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(NO_CASES_ROLE);
  });

  test('returns Application not found when the Observability app is inaccessible', async ({
    page,
    pageObjects,
  }) => {
    const { casesPage } = pageObjects;
    await casesPage.gotoCasesList();
    const notFoundContent = page.testSubj.locator('appNotFoundPageContent');
    await expect(notFoundContent).toBeVisible();
    await expect(notFoundContent).toContainText('Application not found');
  });
});
