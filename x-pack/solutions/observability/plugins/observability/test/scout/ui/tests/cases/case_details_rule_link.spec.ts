/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  FIRST_ACTIVE_ALERT_ID,
  OBSERVABILITY_ALERTS_INDEX,
  generateObservabilityAlerts,
} from '../../fixtures/alerts_data';
import { CASES_ALL_WITH_ALERTS_ROLE } from '../../fixtures/roles';

// Ported from the "Case detail rule link" suite in the FTR
// pages/cases/case_details.ts. An alert attachment in a case renders a link to
// the rule that produced it, which navigates to the rule management page.
test.describe(
  'Observability cases - case detail rule link',
  { tag: [...tags.stateful.classic] },
  () => {
    let caseId: string;

    test.beforeAll(async ({ esClient, apiServices }) => {
      await generateObservabilityAlerts(esClient);

      const { data } = await apiServices.cases.create({
        title: 'Sample case',
        description: 'Created by the Observability cases Scout suite',
        tags: [],
        owner: 'observability',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false, extractObservables: false },
      });
      caseId = data.id;

      await apiServices.cases.comments.create(caseId, {
        type: 'alert',
        owner: 'observability',
        alertId: FIRST_ACTIVE_ALERT_ID,
        index: OBSERVABILITY_ALERTS_INDEX,
        rule: { id: 'rule-id', name: 'My rule name' },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(CASES_ALL_WITH_ALERTS_ROLE);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.cases.cleanup.deleteAllCases();
    });

    test('links to the observability rule page from the case detail', async ({
      page,
      pageObjects,
    }) => {
      const { casesPage } = pageObjects;
      await casesPage.gotoCase(caseId);
      await expect(casesPage.caseViewTitle).toBeVisible();

      await casesPage.clickAlertRuleLink();

      await expect(page).toHaveURL(/\/app\/management\/insightsAndAlerting\/triggersActions\/rule/);
    });
  }
);
