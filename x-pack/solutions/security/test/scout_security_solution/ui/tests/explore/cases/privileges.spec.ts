/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteCases, deleteAllCases } from '../../../common/api_helpers';
import { CASES_URL } from '../../../common/urls';

test.describe('Cases privileges', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ apiServices, kbnClient }) => {
    await deleteAllCases(apiServices.cases);
    await deleteCases(kbnClient);
  });

  test('admin user can access cases and create new case', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.explore.gotoCases();

    const createCaseBtn = page.testSubj.locator('createNewCaseBtn');
    await expect(createCaseBtn).toBeVisible({ timeout: 15_000 });
  });

  test('viewer user can see cases but has limited actions', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.explore.gotoUrl(CASES_URL);

    const casesPage = page.testSubj.locator('cases-table-page');
    await expect(casesPage).toBeVisible({ timeout: 15_000 });
  });
});
