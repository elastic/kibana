/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { ALERT_STATUS_CONTROL_ID } from '../../fixtures/constants';
import { generateObservabilityAlerts, OBSERVABILITY_ALERT_RULE } from '../../fixtures/alerts_data';

// Ported from the `Actions Button` describe of the FTR `Observability alerts`
// suite (x-pack/solutions/observability/test/observability_functional/apps/observability/pages/alerts/index.ts).
test.describe('Observability alerts - row actions', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await generateObservabilityAlerts(esClient);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.alertsTablePage.goto();
    await pageObjects.alertControls.clearControlSelections(ALERT_STATUS_CONTROL_ID);
    await pageObjects.alertsTablePage.waitForTableToLoad();
  });

  test('opens the rule details page from the "View Rule Details" row action', async ({
    page,
    pageObjects,
  }) => {
    const { alertsTablePage } = pageObjects;

    await alertsTablePage.openActionsMenuForRow(0);
    await alertsTablePage.clickViewRuleDetails();

    // The legacy test asserted the "Stack Management" breadcrumb; here we assert
    // the rule details URL directly, which is stable regardless of breadcrumb copy.
    await expect.poll(() => page.url()).toContain(`/rule/${OBSERVABILITY_ALERT_RULE.uuid}`);
  });
});
