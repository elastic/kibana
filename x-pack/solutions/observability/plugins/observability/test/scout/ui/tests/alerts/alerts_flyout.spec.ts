/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { generateObservabilityAlerts } from '../../fixtures/alerts_data';

// Ported from the `Flyout` describe of the FTR `Observability alerts` suite
// (x-pack/solutions/observability/test/observability_functional/apps/observability/pages/alerts/index.ts).
// The flyout has since been redesigned from a static description list into an
// Overview/Metadata tabbed layout, so instead of the FTR's exact field-value
// assertions we verify the current flyout structure and navigation affordances.
test.describe('Observability alerts - flyout', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await generateObservabilityAlerts(esClient);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.alertsTablePage.goto();
  });

  test('opens and closes the alert flyout', async ({ pageObjects }) => {
    const { alertsTablePage } = pageObjects;

    await alertsTablePage.openFlyout(0);
    await expect(alertsTablePage.flyout).toBeVisible();
    await expect(alertsTablePage.flyoutTitle).toContainText('APM Failed Transaction Rate (one)');

    await alertsTablePage.closeFlyout();
    await expect(alertsTablePage.flyout).toBeHidden();
  });

  test('shows the alert overview and navigation links in the flyout', async ({ pageObjects }) => {
    const { alertsTablePage } = pageObjects;

    await alertsTablePage.openFlyout(0);

    await expect(alertsTablePage.flyoutOverviewPanel).toBeVisible();
    await expect(alertsTablePage.flyoutViewRuleDetailsLink).toBeVisible();
    await expect(alertsTablePage.flyoutViewInAppButton).toBeVisible();
    await expect(alertsTablePage.flyoutAlertDetailsButton).toBeVisible();
  });
});
