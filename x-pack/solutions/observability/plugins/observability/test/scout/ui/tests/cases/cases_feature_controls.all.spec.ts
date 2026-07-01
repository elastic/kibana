/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { CASES_ALL_ROLE } from '../../fixtures/roles';

// Ported from the "observability cases all privileges" suite in the FTR
// feature_controls/observability_security.ts. A user with
// `observabilityCasesV3: ['all']` can list, create and edit cases.
test.describe('Observability cases - all privileges', { tag: [...tags.stateful.classic] }, () => {
  let caseId: string;

  test.beforeAll(async ({ apiServices }) => {
    const { data } = await apiServices.cases.create({
      title: 'Editable case',
      description: 'Created by the Observability cases Scout suite',
      tags: [],
      owner: 'observability',
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: false, extractObservables: false },
    });
    caseId = data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(CASES_ALL_ROLE);
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.cases.cleanup.deleteAllCases();
  });

  test('shows the cases list with an enabled create button and no read-only badge', async ({
    pageObjects,
  }) => {
    const { casesPage } = pageObjects;
    await casesPage.gotoCasesList();
    await expect(casesPage.listTitle).toBeVisible();
    await expect(casesPage.createCaseButton).toBeVisible();
    await expect(casesPage.createCaseButton).toBeEnabled();
    await expect(casesPage.readOnlyBadge).toBeHidden();
  });

  test('opens the create-case form', async ({ pageObjects }) => {
    const { casesPage } = pageObjects;
    await casesPage.gotoCasesList();
    await casesPage.clickCreateCase();
    await expect(casesPage.createCaseForm).toBeVisible();
  });

  test('allows an existing case to be edited', async ({ pageObjects }) => {
    const { casesPage } = pageObjects;
    await casesPage.gotoCase(caseId);
    await expect(casesPage.caseViewTitle).toBeVisible();
    await casesPage.typeComment('A comment from the Observability cases Scout suite');
    await expect(casesPage.submitCommentButton).toBeEnabled();
  });
});
