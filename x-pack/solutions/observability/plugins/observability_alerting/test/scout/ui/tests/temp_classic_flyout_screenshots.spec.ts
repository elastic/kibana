/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMP — delete before merge. Captures before/after screenshots of the Classic alert details flyout.

import path from 'path';
import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';

const RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
const SHOT_DIR = path.resolve(process.cwd(), '.playwright-mcp/flyout-migration/classic', RUN);

const suffix = randomUUID();

interface ClassicAlertFixture {
  key: string;
  index: string;
  alertId: string;
  ruleId: string;
  ruleName: string;
  ruleTypeId: string;
  producer: string;
  category: string;
  reason: string;
}

const OBS_ROUTE: ClassicAlertFixture = {
  key: 'obs-route',
  index: '.alerts-observability.apm.alerts-default',
  alertId: `classic-shot-apm-alert-${suffix}`,
  ruleId: `classic-shot-apm-rule-${suffix}`,
  ruleName: `Classic APM error rate ${suffix.slice(0, 8)}`,
  ruleTypeId: 'apm.transaction_error_rate',
  producer: 'apm',
  category: 'Failed transaction rate threshold',
  reason: 'Failed transactions is 35% in the last 5 mins for service: opbeans-java. Alert when > 10%.',
};

const NO_OBS_ROUTE: ClassicAlertFixture = {
  key: 'no-obs-route',
  index: '.alerts-stack.alerts-default',
  alertId: `classic-shot-index-threshold-alert-${suffix}`,
  ruleId: `classic-shot-index-threshold-rule-${suffix}`,
  ruleName: `Classic index threshold ${suffix.slice(0, 8)}`,
  ruleTypeId: '.index-threshold',
  producer: 'stackAlerts',
  category: 'Index threshold',
  reason: 'alert "all documents" is active for group "all documents": count is 42 in the last 5m.',
};

const FIXTURES = [OBS_ROUTE, NO_OBS_ROUTE];

const flyout = (page: ScoutPage) => page.testSubj.locator('classicAlertEpisodeDetailsFlyout');

const shoot = async (page: ScoutPage, name: string) => {
  await page.screenshot({
    path: path.join(SHOT_DIR, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
};

/** The flyout's single-alert lookup; the table's own RAC queries never use `size: 1`. */
const isFlyoutAlertLookup = (fixture: ClassicAlertFixture) => (request: {
  method(): string;
  url(): string;
  postData(): string | null;
}) =>
  request.method() === 'POST' &&
  request.url().includes('/internal/rac/alerts/find') &&
  (request.postData() ?? '').includes(fixture.alertId) &&
  (request.postData() ?? '').includes('"size":1');

test.describe(
  'TEMP Classic alert details flyout screenshots',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ esClient, kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      const start = new Date(Date.now() - 37 * 60 * 1000).toISOString();
      const timestamp = new Date().toISOString();
      for (const fixture of FIXTURES) {
        await esClient.create({
          index: fixture.index,
          id: fixture.alertId,
          refresh: 'wait_for',
          document: {
            '@timestamp': timestamp,
            'event.kind': 'signal',
            'event.action': 'active',
            'kibana.alert.uuid': fixture.alertId,
            'kibana.alert.instance.id': 'default',
            'kibana.alert.flapping': false,
            'kibana.alert.reason': fixture.reason,
            'kibana.alert.status': 'active',
            'kibana.alert.severity': 'critical',
            'kibana.alert.start': start,
            'kibana.alert.duration.us': 37 * 60 * 1000 * 1000,
            'kibana.alert.time_range': { gte: start },
            'kibana.alert.workflow_status': 'open',
            'kibana.alert.rule.category': fixture.category,
            'kibana.alert.rule.consumer': 'alerts',
            'kibana.alert.rule.name': fixture.ruleName,
            'kibana.alert.rule.producer': fixture.producer,
            'kibana.alert.rule.rule_type_id': fixture.ruleTypeId,
            'kibana.alert.rule.uuid': fixture.ruleId,
            'kibana.alert.rule.tags': ['screenshots', 'classic'],
            'kibana.space_ids': ['default'],
            'kibana.version': '9.0.0',
          },
        });
      }
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      for (const fixture of FIXTURES) {
        await esClient.deleteByQuery({
          index: fixture.index,
          query: { ids: { values: [fixture.alertId] } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        });
      }
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    for (const fixture of FIXTURES) {
      test(`captures the ${fixture.key} variant`, async ({ page, pageObjects }) => {
        const alerting = pageObjects.observabilityAlerting;

        await test.step('open the flyout', async () => {
          await alerting.gotoInboxFilteredByRule(fixture.ruleId);
          await expect(alerting.pageTitle).toHaveText('Alerts', { timeout: 30_000 });
          await expect(alerting.expandRowButton).toHaveCount(1, { timeout: 30_000 });
          await alerting.expandRowButton.click();
          await expect(page.testSubj.locator('classicAlertEpisodeDetailsTabs')).toBeVisible({
            timeout: 30_000,
          });
          await expect(flyout(page)).toContainText(fixture.ruleName);
        });

        await test.step('Overview tab', async () => {
          await page.testSubj.locator('classicAlertEpisodeOverviewTab').click();
          await expect(page.testSubj.locator('classicAlertEpisodeOverviewTabPanel')).toBeVisible();
          await shoot(page, `${fixture.key}-01-overview`);
        });

        await test.step('Fields tab', async () => {
          await page.testSubj.locator('classicAlertEpisodeFieldsTab').click();
          await expect(page.testSubj.locator('classicAlertEpisodeFieldsTabPanel')).toBeVisible();
          await page.waitForTimeout(500);
          await shoot(page, `${fixture.key}-02-fields`);
        });

        await test.step('Take action menu open on each tab', async () => {
          const takeAction = page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton');
          await expect(takeAction).toBeVisible();
          const menuItems = page.locator('[data-test-subj^="alertingV2EpisodeTakeAction-"]');

          await page.testSubj.locator('classicAlertEpisodeOverviewTab').click();
          await takeAction.click();
          await expect(menuItems.first()).toBeVisible();
          // The popover positions itself after it becomes visible.
          await page.waitForTimeout(800);
          await shoot(page, `${fixture.key}-03-overview-take-action-menu`);
          await page.keyboard.press('Escape');
          await expect(menuItems.first()).toBeHidden();

          await page.testSubj.locator('classicAlertEpisodeFieldsTab').click();
          await takeAction.click();
          await expect(menuItems.first()).toBeVisible();
          // The popover positions itself after it becomes visible.
          await page.waitForTimeout(800);
          await shoot(page, `${fixture.key}-04-fields-take-action-menu`);
          await page.keyboard.press('Escape');
        });
      });
    }

    test('captures the loading and error states', async ({ page, pageObjects }) => {
      const alerting = pageObjects.observabilityAlerting;
      const isLookup = isFlyoutAlertLookup(OBS_ROUTE);

      let releaseLookup = () => {};
      const lookupHeld = new Promise<void>((resolve) => {
        releaseLookup = resolve;
      });
      let failLookup = false;
      await page.route('**/internal/rac/alerts/find', async (route) => {
        if (!isLookup(route.request())) {
          await route.continue();
          return;
        }
        if (failLookup) {
          await route.fulfill({ status: 500, json: { message: 'Simulated failure' } });
          return;
        }
        await lookupHeld;
        await route.continue();
      });

      await alerting.gotoInboxFilteredByRule(OBS_ROUTE.ruleId);
      await expect(alerting.expandRowButton).toHaveCount(1, { timeout: 30_000 });

      await test.step('loading', async () => {
        await alerting.expandRowButton.click();
        await expect(page.testSubj.locator('classicAlertEpisodeDetailsLoading')).toBeVisible();
        await shoot(page, 'state-01-loading');
        releaseLookup();
        await expect(page.testSubj.locator('classicAlertEpisodeDetailsTabs')).toBeVisible({
          timeout: 30_000,
        });
      });

      await test.step('error', async () => {
        failLookup = true;
        await alerting.gotoInboxFilteredByRule(OBS_ROUTE.ruleId);
        await expect(alerting.expandRowButton).toHaveCount(1, { timeout: 30_000 });
        await alerting.expandRowButton.click();
        await expect(page.testSubj.locator('classicAlertEpisodeDetailsError')).toBeVisible({
          timeout: 30_000,
        });
        await shoot(page, 'state-02-error');
      });
    });
  }
);
