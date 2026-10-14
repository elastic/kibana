/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  ANOMALIES_DATE_WITH_DATA,
  ANOMALIES_DATE_WITHOUT_DATA,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  DEFAULT_ANOMALY_THRESHOLD,
  EXTENDED_TIMEOUT,
  LOWERED_ANOMALY_THRESHOLD,
} from '../fixtures/constants';

const SOURCE_CONFIG_PATH = '/api/metrics/source/default';

// The anomaly threshold is stored on the shared default source configuration and read by the
// anomalies table when it filters results. It's set via the API (rather than the settings form)
// because it is test setup here, not the behavior under test; only this spec consumes it.
const setAnomalyThreshold = async (kbnClient: KbnClient, anomalyThreshold: number) => {
  await kbnClient.request({
    method: 'PATCH',
    path: SOURCE_CONFIG_PATH,
    body: { anomalyThreshold },
  });
};

test.describe('Metrics UI Anomaly Flyout', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, page }) => {
    // Repair state left by a previously interrupted run, and isolate tests that mutate
    // the shared default source configuration.
    await setAnomalyThreshold(kbnClient, DEFAULT_ANOMALY_THRESHOLD);
    await page.clock.install({ time: new Date('2021-05-24T00:00:00.000Z') });
    await browserAuth.loginAsAdmin();
  });

  test('shows both the Hosts and Kubernetes job cards on the inventory page', async ({
    pageObjects: { inventoryPage, anomalyFlyoutPage },
  }) => {
    await inventoryPage.goToPage();
    await anomalyFlyoutPage.open();

    await expect(anomalyFlyoutPage.hostsJobCard).toBeVisible();
    await expect(anomalyFlyoutPage.k8sJobCard).toBeVisible();
  });

  test('shows only the Hosts job card on the hosts view', async ({
    pageObjects: { hostsPage, anomalyFlyoutPage },
  }) => {
    await hostsPage.goToPage({ from: DATE_WITH_HOSTS_DATA_FROM, to: DATE_WITH_HOSTS_DATA_TO });
    await anomalyFlyoutPage.open();

    await expect(anomalyFlyoutPage.hostsJobCard).toBeVisible();
    await expect(anomalyFlyoutPage.k8sJobCard).toBeHidden();
  });

  test('shows no anomalies for the default (recent) time range', async ({
    pageObjects: { inventoryPage, anomalyFlyoutPage },
  }) => {
    await inventoryPage.goToPage();
    await anomalyFlyoutPage.open();
    await anomalyFlyoutPage.goToAnomaliesTab();

    await anomalyFlyoutPage.selectHostsJobType();
    await expect(anomalyFlyoutPage.noAnomaliesMessage).toBeVisible({ timeout: EXTENDED_TIMEOUT });

    await anomalyFlyoutPage.selectK8sJobType();
    await expect(anomalyFlyoutPage.noAnomaliesMessage).toBeVisible({ timeout: EXTENDED_TIMEOUT });

    await anomalyFlyoutPage.close();
  });

  test('lists the archived host and pod anomalies at the default threshold', async ({
    kbnClient,
    pageObjects: { inventoryPage, anomalyFlyoutPage },
  }) => {
    await setAnomalyThreshold(kbnClient, DEFAULT_ANOMALY_THRESHOLD);

    await inventoryPage.goToPage();
    await anomalyFlyoutPage.open();
    await anomalyFlyoutPage.goToAnomaliesTab();

    await anomalyFlyoutPage.selectHostsJobType();
    await anomalyFlyoutPage.setStartDate(ANOMALIES_DATE_WITH_DATA);
    await anomalyFlyoutPage.expectAnomalyCount(2);

    await anomalyFlyoutPage.selectK8sJobType();
    await anomalyFlyoutPage.expectAnomalyCount(1);

    await anomalyFlyoutPage.close();
  });

  test('shows no anomalies once the start date is moved past the data', async ({
    kbnClient,
    pageObjects: { inventoryPage, anomalyFlyoutPage },
  }) => {
    await setAnomalyThreshold(kbnClient, DEFAULT_ANOMALY_THRESHOLD);

    await inventoryPage.goToPage();
    await anomalyFlyoutPage.open();
    await anomalyFlyoutPage.goToAnomaliesTab();

    await anomalyFlyoutPage.selectHostsJobType();
    await anomalyFlyoutPage.setStartDate(ANOMALIES_DATE_WITHOUT_DATA);
    await expect(anomalyFlyoutPage.noAnomaliesMessage).toBeVisible({ timeout: EXTENDED_TIMEOUT });

    await anomalyFlyoutPage.selectK8sJobType();
    await expect(anomalyFlyoutPage.noAnomaliesMessage).toBeVisible({ timeout: EXTENDED_TIMEOUT });

    await anomalyFlyoutPage.close();
  });

  test('lists more anomalies when the anomaly threshold is lowered', async ({
    kbnClient,
    pageObjects: { inventoryPage, anomalyFlyoutPage },
  }) => {
    await setAnomalyThreshold(kbnClient, LOWERED_ANOMALY_THRESHOLD);

    await inventoryPage.goToPage();
    await anomalyFlyoutPage.open();
    await anomalyFlyoutPage.goToAnomaliesTab();

    await anomalyFlyoutPage.selectHostsJobType();
    await anomalyFlyoutPage.setStartDate(ANOMALIES_DATE_WITH_DATA);
    await anomalyFlyoutPage.expectAnomalyCount(4);

    await anomalyFlyoutPage.selectK8sJobType();
    await anomalyFlyoutPage.expectAnomalyCount(3);

    await anomalyFlyoutPage.close();
  });

  test("navigates to the affected hosts from an anomaly's action menu", async ({
    page,
    kbnClient,
    pageObjects: { inventoryPage, anomalyFlyoutPage },
  }) => {
    await setAnomalyThreshold(kbnClient, LOWERED_ANOMALY_THRESHOLD);

    await inventoryPage.goToPage();
    await anomalyFlyoutPage.open();
    await anomalyFlyoutPage.goToAnomaliesTab();

    await anomalyFlyoutPage.selectHostsJobType();
    await anomalyFlyoutPage.setStartDate(ANOMALIES_DATE_WITH_DATA);

    const hostName = await anomalyFlyoutPage.getFirstNodeName();
    await anomalyFlyoutPage.clickShowAffectedHosts();

    // The action links to the Hosts view with a `host.name` terms filter for the anomaly's
    // influencer; the filter is rison-encoded into the URL, so assert on the decoded form.
    await expect
      .poll(() => decodeURIComponent(page.url()), { timeout: EXTENDED_TIMEOUT })
      .toContain(`query:(terms:(host.name:!(${hostName})))`);
  });
});
