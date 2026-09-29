/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { makeChecks } from '../fixtures/helpers/make_checks';
import { makeTls } from '../fixtures/helpers/make_tls';

const MONITOR_ID = 'a11yTestMonitor';

// Matches the FTR app snapshot: scan the whole page, skip chart canvases.
const CHART_EXCLUSION = '[role="graphics-document"][aria-roledescription="visualization"]';

const scanPage = (page: ScoutPage) =>
  page.checkA11y({
    exclude: [CHART_EXCLUSION],
    // The overview includes the Observability chrome and a chart; the default 10s scan budget is too small.
    timeoutMs: 60_000,
  });

test.describe('Uptime accessibility', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ esClient, kbnClient }) => {
    await kbnClient.uiSettings.update({ 'observability:enableLegacyUptimeApp': true });
    // Partial x509 fails monitor-list runtime validation (issuer.distinguished_name) and stalls overview.
    await makeChecks(esClient, MONITOR_ID, 150, 1, 1000, {
      tls: makeTls({
        commonName: 'a11y_common_name',
        expiry: moment().add(30, 'days').toISOString(),
      }),
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.uptimeApp.navigateToOverview();
    await pageObjects.uptimeApp.waitForMonitorIds([MONITOR_ID]);
  });

  test.afterAll(async ({ esClient }) => {
    // makePing writes into the full-heartbeat index. Delete only this monitor so later specs keep the archive.
    await esClient.deleteByQuery({
      index: 'heartbeat-8-full-test',
      query: { term: { 'monitor.id': MONITOR_ID } },
      refresh: true,
      conflicts: 'proceed',
    });
  });

  test('overview page', async ({ page }) => {
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });

  test('overview page with expanded monitor detail', async ({ page, pageObjects }) => {
    await pageObjects.uptimeOverview.expandMonitorDetail(MONITOR_ID);
    await pageObjects.uptimeOverview.openMonitorActionsPopover(MONITOR_ID);
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });

  test('overview alert popover controls', async ({ page, pageObjects }) => {
    await pageObjects.uptimeOverview.openAlertsPopover();
    await pageObjects.toasts.dismissAll();
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });

  test('overview alert popover controls nested content', async ({ page, pageObjects }) => {
    await pageObjects.uptimeOverview.openNestedAlertContext();
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });

  test('detail page', async ({ page, pageObjects }) => {
    await pageObjects.uptimeApp.navigateToMonitor(MONITOR_ID);
    await expect(page.testSubj.locator('uptimeOverallAvailability')).toHaveText('0.00 %');
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });

  test('settings page', async ({ page, pageObjects }) => {
    await pageObjects.uptimeApp.navigateToSettings();
    // The route wrapper renders before the settings fetch replaces the loading inputs.
    await pageObjects.uptimeApp.loadSettingsFields();
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });

  test('certificates page', async ({ page, pageObjects }) => {
    await pageObjects.uptimeApp.navigateToCertificates();
    const table = page.testSubj.locator('uptimeCertificatesTable');
    await expect(table).toBeVisible();
    await expect(table).not.toContainText('Loading certificates');
    expect((await scanPage(page)).violations).toStrictEqual([]);
  });
});
