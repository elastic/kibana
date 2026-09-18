/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';

const suffix = randomUUID();
const alertId = `nightshift-v2-alert-${suffix}`;
const ruleId = `nightshift-v2-rule-${suffix}`;
const ruleName = `Nightshift v2 test rule ${suffix}`;
const alertIndex = '.alerts-observability.apm.alerts-default';

const mockNightshiftApis = async (page: any) => {
  await page.route('**/internal/nightshift/investigations/availability', async (route: any) => {
    await route.fulfill({ status: 200, json: { available: true } });
  });
  await page.route('**/internal/nightshift/investigations?*', async (route: any) => {
    await route.fulfill({
      status: 200,
      json: {
        results: [],
        page: 1,
        size: 2,
        total: 0,
      },
    });
  });
  await page.route(
    (url: URL) =>
      url.pathname.endsWith('/internal/nightshift/investigations') && url.searchParams.size === 0,
    async (route: any) => {
      await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
    }
  );
};

test.describe(
  'Observability Alerting v2 Inbox investigation actions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      const timestamp = new Date().toISOString();
      await esClient.create({
        index: alertIndex,
        id: alertId,
        refresh: 'wait_for',
        document: {
          '@timestamp': timestamp,
          'event.kind': 'signal',
          'kibana.alert.uuid': alertId,
          'kibana.alert.flapping': false,
          'kibana.alert.reason': 'Transaction error rate high',
          'kibana.alert.status': 'active',
          'kibana.alert.start': timestamp,
          'kibana.alert.time_range': { gte: timestamp },
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.rule.category': 'Error rate',
          'kibana.alert.rule.consumer': 'alerts',
          'kibana.alert.rule.name': ruleName,
          'kibana.alert.rule.producer': 'apm',
          'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
          'kibana.alert.rule.uuid': ruleId,
          'kibana.space_ids': ['default'],
          'kibana.version': '8.0.0',
        },
      });
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await mockNightshiftApis(page);
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      await esClient.deleteByQuery({
        index: alertIndex,
        query: { ids: { values: [alertId] } },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('triggers investigation from inbox table row overflow menu', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;
      await alerting.gotoInboxFilteredByRule(ruleId);
      await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
      await expect(alerting.episodesListPage).toBeVisible();

      const menuButton = page.testSubj.locator('unifiedDataTable_additionalRowControl_actionsMenu');
      await expect(menuButton).toBeVisible({ timeout: 30_000 });

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );

      await menuButton.click();
      const investigateItem = page.testSubj.locator('investigateAlert');
      await expect(investigateItem).toBeVisible();
      await investigateItem.click();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: alertId },
      });
    });

    test('triggers investigation from classic alert details flyout take action menu', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;
      await alerting.gotoInboxFilteredByRule(ruleId);
      await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
      await expect(alerting.expandRowButton).toBeVisible({ timeout: 30_000 });

      await alerting.openEpisodeFlyout();
      await expect(page.testSubj.locator('classicAlertEpisodeDetailsTabs')).toBeVisible({
        timeout: 30_000,
      });

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );

      await page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton').click();
      const investigateItem = page.testSubj.locator('investigateAlert');
      await expect(investigateItem).toBeVisible();
      await investigateItem.click();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: alertId },
      });
    });
  }
);
