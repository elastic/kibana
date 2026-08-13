/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { ALERT_COUNTS, ALERT_STATUS_CONTROL_ID } from '../../fixtures/constants';
import { generateObservabilityAlerts } from '../../fixtures/alerts_data';

// Ported from the FTR `Alert summary widget` suite
// (x-pack/solutions/observability/test/observability_functional/apps/observability/pages/alerts/alert_summary_widget.ts).
// The two FTR `it` blocks shared one browser session (the second cleared the
// status control), so they are combined into a single journey with `test.step`s.
test.describe('Observability alerts - summary widget', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await generateObservabilityAlerts(esClient);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.alertsTablePage.goto();
  });

  test('shows active and total alert counts', async ({ pageObjects }) => {
    const { alertsTablePage, alertControls } = pageObjects;

    await test.step('reflects only active alerts while the status filter is active', async () => {
      await expect(alertsTablePage.summaryWidget).toBeVisible();
      // Default view is filtered to active alerts, so active === total.
      await expect(alertsTablePage.summaryActiveAlertCount).toHaveText(`${ALERT_COUNTS.ACTIVE}`);
      await expect(alertsTablePage.summaryTotalAlertCount).toHaveText(`${ALERT_COUNTS.ACTIVE}`);
    });

    await test.step('reflects all alerts once the status filter is cleared', async () => {
      await alertControls.clearControlSelections(ALERT_STATUS_CONTROL_ID);
      await alertsTablePage.waitForTableToLoad();
      await expect(alertsTablePage.summaryActiveAlertCount).toHaveText(`${ALERT_COUNTS.ACTIVE}`);
      await expect(alertsTablePage.summaryTotalAlertCount).toHaveText(`${ALERT_COUNTS.ALL}`);
    });
  });
});
