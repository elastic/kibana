/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { CASES_READ_ROLE } from '../../fixtures/roles';

// Ported from the "observability cases read-only privileges" suite in the FTR
// feature_controls/observability_security.ts. A user with
// `observabilityCasesV3: ['read']` can browse cases but cannot create or edit
// them, and sees the read-only chrome badge.
test.describe(
  'Observability cases - read-only privileges',
  { tag: [...tags.stateful.classic] },
  () => {
    let caseId: string;

    test.beforeAll(async ({ apiServices }) => {
      const { data } = await apiServices.cases.create({
        title: 'Read-only case',
        description: 'Created by the Observability cases Scout suite',
        tags: [],
        owner: 'observability',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false, extractObservables: false },
      });
      caseId = data.id;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(CASES_READ_ROLE);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.cases.cleanup.deleteAllCases();
    });

    test('shows the cases list with a read-only badge and no create button', async ({
      pageObjects,
    }) => {
      const { casesPage } = pageObjects;
      await casesPage.gotoCasesList();
      await expect(casesPage.listTitle).toBeVisible();
      await expect(casesPage.readOnlyBadge).toBeVisible();
      await expect(casesPage.createCaseButton).toBeHidden();
    });

    test('does not allow a case to be created', async ({ pageObjects }) => {
      const { casesPage } = pageObjects;
      // Navigating straight to the create route renders the in-app "Privileges
      // required" prompt in place (the Cases app does not redirect), so neither
      // the create form nor the create button render.
      await casesPage.gotoCreateCase();
      await expect(casesPage.noPrivilegesPrompt).toBeVisible();
      await expect(casesPage.createCaseForm).toBeHidden();
      await expect(casesPage.createCaseButton).toBeHidden();
    });

    test('does not allow an existing case to be edited', async ({ pageObjects }) => {
      const { casesPage } = pageObjects;
      await casesPage.gotoCase(caseId);
      await expect(casesPage.caseViewTitle).toBeVisible();
      await expect(casesPage.submitCommentButton).toBeHidden();
    });
  }
);
