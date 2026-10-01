/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../scout/ui/fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../../../scout/ui/fixtures/alerting_v2_setting';

const suffix = randomUUID();
const alertId = `nightshift-v2-alert-${suffix}`;
const ruleId = `nightshift-v2-rule-${suffix}`;
const ruleName = `Nightshift v2 test rule ${suffix}`;
const alertIndex = '.alerts-observability.apm.alerts-default';

/** A shared investigations list response (`GET /internal/investigations/investigations`). */
const investigationsList = (inProgress?: boolean) => ({
  results:
    inProgress === undefined
      ? []
      : [
          {
            id: 'investigation-1',
            title: 'Investigation',
            created_at: '2026-09-15T12:00:00.000Z',
            updated_at: '2026-09-15T12:05:00.000Z',
            agent_id: 'nightshift.investigation',
            metadata: { status: 'open' },
            in_progress: inProgress,
            subjects: [{ type: 'alert', id: alertId, created_at: '2026-09-15T12:00:00.000Z' }],
          },
        ],
  pagination: { total: inProgress === undefined ? 0 : 1, page: 1, per_page: 10 },
});

const isInvestigationsList = (url: URL) =>
  url.pathname.endsWith('/internal/investigations/investigations') && url.searchParams.size > 0;

const mockNightshiftApis = async (page: any) => {
  await page.route(
    (url: URL) => url.pathname.endsWith('/internal/nightshift/investigations/availability'),
    async (route: any) => {
      await route.fulfill({ status: 200, json: { available: true } });
    }
  );
  await page.route(isInvestigationsList, async (route: any) => {
    await route.fulfill({ status: 200, json: investigationsList() });
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

    test.beforeEach(async ({ browserAuth, kbnClient, page }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
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

      const menuButton = page
        .getByRole('row')
        .filter({ hasText: ruleName })
        .getByRole('button', { name: 'Additional actions' });
      await expect(menuButton).toBeVisible({ timeout: 30_000 });

      const investigationsPromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('/internal/investigations/investigations?')
      );
      await menuButton.click();
      await investigationsPromise;
      const investigateItem = page.testSubj.locator('investigateAlert');
      await expect(investigateItem).toBeVisible();

      let releaseStart = () => {};
      const startHeld = new Promise<void>((resolve) => {
        releaseStart = resolve;
      });
      await page.route(
        (url: URL) =>
          url.pathname.endsWith('/internal/nightshift/investigations') &&
          url.searchParams.size === 0,
        async (route: any) => {
          await startHeld;
          await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
        }
      );
      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await investigateItem.click();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: alertId },
      });
      await expect(investigateItem).toHaveText('Investigating…');
      await expect(investigateItem).toHaveAttribute('aria-disabled', 'true');
      releaseStart();
    });

    test('triggers investigation from classic alert details flyout take action menu', async ({
      page,
      pageObjects,
    }) => {
      const alerting = pageObjects.observabilityAlerting;
      await alerting.gotoInboxFilteredByRule(ruleId);
      await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
      await expect(alerting.expandRowButton).toBeVisible({ timeout: 30_000 });

      await alerting.expandRowButton.click();
      await expect(page.testSubj.locator('classicAlertEpisodeDetailsTabs')).toBeVisible({
        timeout: 30_000,
      });

      await page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton').click();
      const investigateItem = page.testSubj.locator('investigateAlert');
      await expect(investigateItem).toBeVisible();

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await investigateItem.click();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: alertId },
      });
    });

    test('shows investigating state while running and reveals re-investigate only after viewing', async ({
      page,
      pageObjects,
    }) => {
      let inProgress = true;
      await page.route(isInvestigationsList, async (route: any) => {
        await route.fulfill({ status: 200, json: investigationsList(inProgress) });
      });
      const alerting = pageObjects.observabilityAlerting;
      await alerting.gotoInboxFilteredByRule(ruleId);
      await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
      await expect(alerting.episodesListPage).toBeVisible();

      const menuButton = page
        .getByRole('row')
        .filter({ hasText: ruleName })
        .getByRole('button', { name: 'Additional actions' });
      await expect(menuButton).toBeVisible({ timeout: 30_000 });

      const investigationsPromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('/internal/investigations/investigations?')
      );
      await menuButton.click();
      await investigationsPromise;
      const investigateItem = page.testSubj.locator('investigateAlert');
      const viewItem = page.testSubj.locator('viewAlertInvestigation');

      await expect(investigateItem).toBeVisible();
      await expect(investigateItem).toHaveAttribute('aria-disabled', 'true');
      await expect(viewItem).toBeHidden();

      await page.keyboard.press('Escape');

      inProgress = false;
      await page.reload();
      await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
      await expect(menuButton).toBeVisible({ timeout: 30_000 });

      const completedInvestigationsPromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('/internal/investigations/investigations?')
      );
      await menuButton.click();
      await completedInvestigationsPromise;
      await expect(viewItem).toBeVisible();
      await expect(investigateItem).toBeHidden();

      await viewItem.click();
      await expect
        .poll(() => page.url())
        .toContain('/app/nightshift?investigationId=investigation-1');
      await pageObjects.observabilityAlerting.gotoInboxFilteredByRule(ruleId);
      await expect(alerting.pageTitle).toHaveText('Alert episodes', { timeout: 30_000 });
      await expect(menuButton).toBeVisible({ timeout: 30_000 });

      const viewedInvestigationsPromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          response.url().includes('/internal/investigations/investigations?')
      );
      await menuButton.click();
      await viewedInvestigationsPromise;
      await expect(viewItem).toBeVisible();
      await expect(investigateItem).toBeVisible();
      await expect(investigateItem).toHaveText('Re-investigate');
    });
  }
);
