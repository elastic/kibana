/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Temporary: captures the episode flyout opened with Nightshift investigations available, for a
// before/after comparison of @kbn/flyout-template. Needs `--serverConfigSet nightshift_investigations`.

import type { EsClient, ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../scout/ui/fixtures';
import { mockNightshiftApis } from '../fixtures/mocks';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../../../scout/ui/fixtures/alerting_v2_setting';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const SUFFIX = '305245';
const alertId = `flyout-capture-nightshift-alert-${SUFFIX}`;
const ruleId = `flyout-capture-nightshift-rule-${SUFFIX}`;
const ruleName = `Flyout capture Nightshift rule ${SUFFIX}`;
const alertIndex = '.alerts-observability.apm.alerts-default';

const deleteAlert = (esClient: EsClient) =>
  esClient.deleteByQuery({
    index: alertIndex,
    query: { ids: { values: [alertId] } },
    refresh: true,
    conflicts: 'proceed',
    ignore_unavailable: true,
  });

test.describe(
  'Flyout template capture: episode flyout with Nightshift investigations',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ esClient, kbnClient }) => {
      await setAlertingV2EnabledSetting(kbnClient, true);
      await deleteAlert(esClient);
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
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'observability.alertingNavTour.v3',
          JSON.stringify({ isDismissed: true })
        );
      });
      await setAlertingV2EnabledSetting(kbnClient, true);
      await mockNightshiftApis(page, alertId);
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, kbnClient }) => {
      await deleteAlert(esClient);
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('episodes-03-nightshift-investigation-episode', async ({ page, pageObjects }) => {
      const alerting = pageObjects.observabilityAlerting;
      await alerting.gotoInboxFilteredByRule(ruleId);
      await expect(alerting.pageTitle).toHaveText('Alerts', { timeout: 30_000 });
      await expect(alerting.expandRowButton).toBeVisible({ timeout: 30_000 });

      await alerting.expandRowButton.click();
      await expect(page.testSubj.locator('classicAlertEpisodeDetailsTabs')).toBeVisible({
        timeout: 30_000,
      });

      const flyout = page.testSubj.locator('classicAlertEpisodeDetailsFlyout');
      await expect(flyout.locator('.euiFlyoutHeader .euiTitle').first()).toBeVisible();
      await expect(
        flyout.locator(
          '.euiLoadingSpinner, .euiSkeletonText, .euiSkeletonTitle, .euiSkeletonRectangle'
        )
      ).toHaveCount(0, { timeout: 60_000 });
      // The Take action menu carries the Nightshift investigate item this config set enables.
      await page.testSubj.locator('alertingV2EpisodeFlyoutTakeActionButton').click();
      await expect(page.testSubj.locator('investigateAlert')).toBeVisible();
      await page.waitForTimeout(1_500);
      await capture(page, 'episodes-03-nightshift-investigation-episode');
    });
  }
);
