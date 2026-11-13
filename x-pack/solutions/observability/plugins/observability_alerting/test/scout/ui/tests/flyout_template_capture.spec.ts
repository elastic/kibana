/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Temporary: captures the episode flyouts for a before/after comparison of @kbn/flyout-template.

import { ALERT_EVENTS_DATA_STREAM, ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { EsClient, KbnClient, ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import type { ObservabilityAlertingPage } from '../fixtures/page_objects';
import { OBSERVABILITY_ALERTING_ALERTS_PATH } from '../../../../public/constants';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const SUFFIX = '305245';
const V2_RULE_ID = `flyout-template-capture-rule-${SUFFIX}`;
const V2_RULE_NAME = `Flyout template capture rule ${SUFFIX}`;
const V2_EPISODE_ID = `flyout-template-capture-episode-${SUFFIX}`;
const CLASSIC_ALERT_ID = `flyout-template-capture-classic-alert-${SUFFIX}`;
const CLASSIC_RULE_ID = `flyout-template-capture-classic-rule-${SUFFIX}`;
const CLASSIC_RULE_NAME = `Flyout template capture classic rule ${SUFFIX}`;
const CLASSIC_ALERT_INDEX = '.alerts-observability.apm.alerts-default';

const RULE_API_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

/** Start of the current hour: stable across a before/after pair run close together. */
const seedTimestamp = () => {
  const date = new Date();
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
};

const settle = async (page: ScoutPage, testSubj: string) => {
  const flyout = page.testSubj.locator(testSubj);
  await expect(flyout).toBeVisible({ timeout: 60_000 });
  await expect(flyout.locator('.euiFlyoutHeader .euiTitle').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    flyout.locator(
      '.euiLoadingSpinner, .euiSkeletonText, .euiSkeletonTitle, .euiSkeletonRectangle'
    )
  ).toHaveCount(0, { timeout: 60_000 });
  // Lets resize observers and lazy panels settle so the frame is stable.
  await page.waitForTimeout(1_500);
};

/** The inbox defaults to the last 15 minutes; widen it so the start-of-hour seed is listed. */
const gotoInboxForRule = async (alerting: ObservabilityAlertingPage, ruleId: string) => {
  const search = new URLSearchParams({
    _a: `(alertsList:(ruleId:'${ruleId}',timeFrom:now-24h,timeTo:now))`,
  });
  await alerting.goto(`${OBSERVABILITY_ALERTING_ALERTS_PATH}?${search.toString()}`);
  await alerting.inboxPage.waitFor({ state: 'visible' });
};

const deleteSeed = async (esClient: EsClient, kbnClient: KbnClient) => {
  await esClient.deleteByQuery(
    {
      index: ALERT_EVENTS_DATA_STREAM,
      query: { term: { 'rule.id': V2_RULE_ID } },
      refresh: true,
      conflicts: 'proceed',
    },
    { ignore: [404] }
  );
  await esClient.deleteByQuery(
    {
      index: CLASSIC_ALERT_INDEX,
      query: { ids: { values: [CLASSIC_ALERT_ID] } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    },
    { ignore: [404] }
  );
  await kbnClient
    .request({
      description: 'delete capture alerting v2 rule',
      method: 'DELETE',
      path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(V2_RULE_ID)}`,
      headers: RULE_API_HEADERS,
    })
    .catch(() => undefined);
};

test.describe('Flyout template capture: episode flyouts', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient, kbnClient }) => {
    await setAlertingV2EnabledSetting(kbnClient, true);
    await deleteSeed(esClient, kbnClient);

    await kbnClient.request({
      description: 'create capture alerting v2 rule',
      method: 'PUT',
      path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(V2_RULE_ID)}`,
      headers: RULE_API_HEADERS,
      body: {
        kind: 'alert',
        metadata: { name: V2_RULE_NAME },
        schedule: { every: '1h' },
        query: { base: 'FROM logs-* | LIMIT 1' },
        recovery: { strategy: 'no_breach' },
        no_data: { strategy: 'ignore' },
      },
    });
    await kbnClient.request({
      description: 'disable capture alerting v2 rule',
      method: 'POST',
      path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(V2_RULE_ID)}/_disable`,
      headers: RULE_API_HEADERS,
    });

    const timestamp = seedTimestamp();
    await esClient.bulk({
      operations: [
        { create: { _index: ALERT_EVENTS_DATA_STREAM } },
        {
          '@timestamp': timestamp,
          scheduled_timestamp: timestamp,
          rule: { id: V2_RULE_ID, version: 1 },
          group_hash: `${V2_RULE_ID}-group`,
          data: {},
          status: 'breached',
          source: 'scout-test',
          type: 'alert',
          space_id: 'default',
          alert: { id: V2_EPISODE_ID, status: 'active' },
        },
      ],
      refresh: true,
    });

    await esClient.create({
      index: CLASSIC_ALERT_INDEX,
      id: CLASSIC_ALERT_ID,
      refresh: 'wait_for',
      document: {
        '@timestamp': timestamp,
        'event.kind': 'signal',
        'kibana.alert.uuid': CLASSIC_ALERT_ID,
        'kibana.alert.flapping': false,
        'kibana.alert.reason': 'Transaction error rate is 12% (threshold 5%)',
        'kibana.alert.status': 'active',
        'kibana.alert.start': timestamp,
        'kibana.alert.time_range': { gte: timestamp },
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.severity': 'critical',
        'kibana.alert.rule.category': 'Error rate',
        'kibana.alert.rule.consumer': 'alerts',
        'kibana.alert.rule.name': CLASSIC_RULE_NAME,
        'kibana.alert.rule.producer': 'apm',
        'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
        'kibana.alert.rule.uuid': CLASSIC_RULE_ID,
        'kibana.alert.rule.tags': ['capture'],
        'kibana.space_ids': ['default'],
        'kibana.version': '8.0.0',
      },
    });
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'observability.alertingNavTour.v3',
        JSON.stringify({ isDismissed: true })
      );
    });
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ esClient, kbnClient }) => {
    await deleteSeed(esClient, kbnClient);
    await unsetAlertingV2EnabledSetting(kbnClient);
  });

  test('episodes-01-details-flyout', async ({ page, pageObjects }) => {
    const alerting = pageObjects.observabilityAlerting;
    await gotoInboxForRule(alerting, V2_RULE_ID);
    await expect(alerting.pageTitle).toHaveText('Alerts', { timeout: 30_000 });
    await expect(alerting.expandRowButton).toHaveCount(1, { timeout: 30_000 });
    await alerting.openEpisodeFlyout();
    await settle(page, 'alertingV2EpisodeFlyout');
    await capture(page, 'episodes-01-details-flyout');
  });

  test('episodes-02-classic-alert-flyout', async ({ page, pageObjects }) => {
    const alerting = pageObjects.observabilityAlerting;
    await gotoInboxForRule(alerting, CLASSIC_RULE_ID);
    await expect(alerting.pageTitle).toHaveText('Alerts', { timeout: 30_000 });
    await expect(alerting.expandRowButton).toHaveCount(1, { timeout: 30_000 });
    await alerting.expandRowButton.click();
    await settle(page, 'classicAlertEpisodeDetailsFlyout');
    await capture(page, 'episodes-02-classic-alert-flyout');
  });
});
