/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Temporary: captures the Nightshift flyouts for a before/after comparison of @kbn/flyout-template.
//
// The detection, rule and event flyouts run on the default config set, with the Nightshift APIs
// mocked. The event alert status flyout is reached from a real investigation, so it needs
// `--serverConfigSet nightshift_investigations` and FLYOUT_CAPTURE_NIGHTSHIFT_INVESTIGATIONS=1.

import { createServer } from 'http';
import type { ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE } from '@kbn/management-settings-ids';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import { mockNightshiftSetUp, test } from '../fixtures';
import { setUpNightshiftServiceAccount } from '../../../../../nightshift_investigations/test/scout_nightshift_investigations/api/fixtures/service_account';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const RUN_INVESTIGATION_CAPTURE = process.env.FLYOUT_CAPTURE_NIGHTSHIFT_INVESTIGATIONS === '1';

const SUFFIX = '305245';
const SOURCE_ID = `flyout-capture-source-${SUFFIX}`;
const EVENT_ID = `flyout-capture-event-${SUFFIX}`;
const RULE_ID = `flyout-capture-rule-${SUFFIX}`;
const RULE_UUID = `flyout-capture-rule-uuid-${SUFFIX}`;
const DETECTION_ID = `flyout-capture-detection-${SUFFIX}`;
const TIMESTAMP = '2026-11-13T12:00:00.000Z';
const RANGE = { from: '2026-11-13T00:00:00.000Z', to: '2026-11-14T00:00:00.000Z' };

const SOURCE = {
  id: SOURCE_ID,
  title: 'Checkout service logs',
  tags: [],
  esql: 'FROM logs-checkout*',
  type: 'logs',
  slug: SOURCE_ID,
  view_name: `$.nightshift.sources.default.${SOURCE_ID}`,
  enabled: true,
  created_by: 'elastic',
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  esql_updated_at: TIMESTAMP,
};

const EVENT = {
  '@timestamp': TIMESTAMP,
  created_at: TIMESTAMP,
  event_id: EVENT_ID,
  episode_id: `flyout-capture-episode-${SUFFIX}`,
  status: 'active',
  source_ids: [SOURCE_ID],
  title: 'Checkout latency spike after deploy',
  summary:
    'P95 latency on the checkout service rose from 120ms to 890ms shortly after a deploy, with a matching rise in upstream timeouts.',
  severity: 'critical',
  confidence: 0.92,
};

const DETECTION = {
  '@timestamp': TIMESTAMP,
  detection_id: DETECTION_ID,
  rule_uuid: RULE_UUID,
  rule_name: 'Checkout p95 latency spike',
  source_id: SOURCE_ID,
  change_point_type: 'spike',
  p_value: 0.0012,
  severity_score: 85,
  processed: false,
};

const RULE = {
  id: RULE_ID,
  title: 'Checkout p95 latency spike',
  description: 'Fires when p95 latency on the checkout service jumps above its recent baseline.',
  type: 'stats',
  esql: {
    query:
      'FROM logs-checkout* | STATS p95 = PERCENTILE(event.duration, 95) BY BUCKET(@timestamp, 1m)',
  },
  severity_score: 85,
  rule_uuid: RULE_UUID,
  rule_enabled: true,
  rule_backed: true,
  source_id: SOURCE_ID,
  occurrences: [0, 1, 0, 3, 8, 2, 0].map((count, index) => ({
    date: new Date(Date.parse(TIMESTAMP) + index * 3_600_000).toISOString(),
    count,
  })),
  change_points: { type: {} },
};

const pathEndsWith = (suffix: string) => (url: URL) => url.pathname.endsWith(suffix);

const mockNightshiftData = async (page: ScoutPage) => {
  await mockNightshiftSetUp(page);
  await page.route('**/internal/significant_events/availability', (route) =>
    route.fulfill({ status: 200, json: { available: true } })
  );
  await page.route(pathEndsWith('/internal/nightshift/sources'), (route) =>
    route.fulfill({
      status: 200,
      json: { sources: [SOURCE], total: 1, page: 1, per_page: 100 },
    })
  );
  await page.route(pathEndsWith('/internal/significant_events/events'), (route) =>
    route.fulfill({ status: 200, json: { hits: [EVENT], total: 1 } })
  );
  await page.route(
    (url) =>
      url.pathname.includes('/internal/significant_events/events/') &&
      url.pathname.endsWith('/lifecycle'),
    (route) =>
      route.fulfill({
        status: 200,
        json: {
          detections: [
            {
              detection_id: DETECTION_ID,
              rule_name: DETECTION.rule_name,
              rule_uuid: RULE_UUID,
              source_id: SOURCE_ID,
              change_point_type: 'spike',
              '@timestamp': TIMESTAMP,
            },
          ],
          events: [EVENT],
        },
      })
  );
  await page.route(pathEndsWith('/internal/significant_events/detections'), (route) =>
    route.fulfill({ status: 200, json: { hits: [DETECTION], total: 1 } })
  );
  await page.route(pathEndsWith(`/internal/significant_events/detections/${DETECTION_ID}`), (route) =>
    route.fulfill({ status: 200, json: DETECTION })
  );
  await page.route(
    pathEndsWith(`/internal/significant_events/detections/${RULE_UUID}/history`),
    (route) => route.fulfill({ status: 200, json: { hits: [DETECTION], total: 1 } })
  );
  await page.route(pathEndsWith('/internal/streams/_queries'), (route) =>
    route.fulfill({ status: 200, json: { queries: [RULE], page: 1, perPage: 1000, total: 1 } })
  );
};

const settle = async (page: ScoutPage, testSubj: string) => {
  const flyout = page.testSubj.locator(testSubj);
  await expect(flyout).toBeVisible({ timeout: 60_000 });
  await expect(flyout.locator('.euiFlyoutHeader .euiTitle').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    flyout.locator(
      '.euiLoadingSpinner, .euiLoadingChart, .euiSkeletonText, .euiSkeletonTitle, .euiSkeletonRectangle'
    )
  ).toHaveCount(0, { timeout: 60_000 });
  // Lets resize observers and lazy panels settle so the frame is stable.
  await page.waitForTimeout(1_500);
};

const detectionsUrl = (tab: string, params: Record<string, string>) =>
  `/app/nightshift/detections/${tab}?${new URLSearchParams({
    rangeFrom: RANGE.from,
    rangeTo: RANGE.to,
    ...params,
  }).toString()}`;

test.describe('Flyout template capture: Nightshift flyouts', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ apiServices, kbnClient }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: true },
    });
    await kbnClient.uiSettings.update({ [OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE]: true });
  });

  test.beforeEach(async ({ browserAuth, page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    await kbnClient.uiSettings.unset(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE);
    if (!RUN_INVESTIGATION_CAPTURE) {
      await apiServices.core.settings({
        'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: null },
      });
    }
  });

  test('nightshift-01-detection-details', async ({ page, kbnUrl }) => {
    test.skip(RUN_INVESTIGATION_CAPTURE, 'Runs on the default config set');
    await mockNightshiftData(page);
    await page.goto(kbnUrl.get(detectionsUrl('signals', { signalId: DETECTION_ID })));
    await settle(page, 'nightshiftDetectionDetailsFlyout');
    await capture(page, 'nightshift-01-detection-details');
  });

  test('nightshift-02-rule', async ({ page, kbnUrl }) => {
    test.skip(RUN_INVESTIGATION_CAPTURE, 'Runs on the default config set');
    await mockNightshiftData(page);
    await page.goto(kbnUrl.get(detectionsUrl('rules', { ruleId: RULE_ID })));
    await settle(page, 'nightshiftRuleFlyout');
    await capture(page, 'nightshift-02-rule');
  });

  test('nightshift-03-event', async ({ page, kbnUrl }) => {
    test.skip(RUN_INVESTIGATION_CAPTURE, 'Runs on the default config set');
    await mockNightshiftData(page);
    await page.goto(kbnUrl.get(detectionsUrl('events', { eventId: EVENT_ID })));
    await settle(page, 'nightshiftEventFlyout');
    await capture(page, 'nightshift-03-event');
  });

  test.describe('from an investigation', () => {
    const ALERT_ID = `flyout-capture-significant-event-alert-${SUFFIX}`;
    const MISSING_EVENT_ID = `flyout-capture-missing-event-${SUFFIX}`;
    const RULE_EVENTS_INDEX = '.rule-events';
    const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
    const SCOUT_LLM_PORT = 8095;
    let investigationId: string;
    let closeLlm = () => {};

    test.beforeAll(async ({ esClient, kbnClient, kbnUrl, samlAuth, log }) => {
      if (!RUN_INVESTIGATION_CAPTURE) {
        return;
      }
      test.setTimeout(300_000);
      await setUpNightshiftServiceAccount({
        kbnUrl,
        esClient,
        samlAuth,
        isServerless: false,
        log,
      });
      // An LLM endpoint that never answers keeps the investigation in progress without a model.
      const llm = createServer(() => {});
      await new Promise<void>((resolve) => llm.listen(SCOUT_LLM_PORT, '127.0.0.1', resolve));
      closeLlm = () => {
        llm.closeAllConnections();
        llm.close();
      };

      await esClient.deleteByQuery(
        {
          index: RULE_EVENTS_INDEX,
          query: { term: { 'alert.id': ALERT_ID } },
          refresh: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
      const now = new Date().toISOString();
      await esClient.index({
        index: RULE_EVENTS_INDEX,
        op_type: 'create',
        refresh: true,
        document: {
          '@timestamp': now,
          scheduled_timestamp: now,
          type: 'alert',
          source: 'elastic.significant_events',
          status: 'breached',
          severity: 'high',
          alert: { id: ALERT_ID, status: 'active' },
          group_hash: ALERT_ID,
          space_id: 'default',
          // No such event: the status flyout settles on its "unable to load" state.
          data: { rule_name: `Flyout capture significant event ${SUFFIX}`, event_id: MISSING_EVENT_ID },
        },
      });

      const { data } = await kbnClient.request<{ investigation_id: string }>({
        description: 'start an investigation for the significant event alert',
        method: 'POST',
        path: '/internal/nightshift/investigations',
        headers: HEADERS,
        body: { subject: { type: 'alert', ids: [ALERT_ID] } },
      });
      investigationId = data.investigation_id;

      await expect
        .poll(
          async () => {
            const { data: investigation } = await kbnClient.request<{
              subjects: unknown[];
            }>({
              method: 'GET',
              path: `/internal/investigations/investigations/${investigationId}`,
              headers: { ...HEADERS, 'elastic-api-version': '1' },
              ignoreErrors: [404],
            });
            return investigation?.subjects?.length ?? 0;
          },
          { timeout: 150_000, intervals: [1_000] }
        )
        .toBeGreaterThan(0);
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      if (!RUN_INVESTIGATION_CAPTURE) {
        return;
      }
      await kbnClient
        .request({
          method: 'POST',
          path: '/api/workflows/workflow/system-nightshift-investigation/executions/cancel',
          headers: { ...HEADERS, 'elastic-api-version': '2023-10-31' },
          ignoreErrors: [404],
        })
        .catch(() => undefined);
      closeLlm();
      await esClient.deleteByQuery(
        {
          index: RULE_EVENTS_INDEX,
          query: { term: { 'alert.id': ALERT_ID } },
          refresh: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
      await apiServices.core.settings({
        'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: null },
      });
    });

    test('nightshift-04-event-alert-status', async ({ page, kbnUrl }) => {
      test.skip(
        !RUN_INVESTIGATION_CAPTURE,
        'Needs the nightshift_investigations config set and FLYOUT_CAPTURE_NIGHTSHIFT_INVESTIGATIONS=1'
      );
      await page.goto(kbnUrl.get(`/app/nightshift?investigationId=${investigationId}`));
      const investigationFlyout = page.testSubj.locator(
        'agentBuilderConversationDetailsFlyout-snapshot'
      );
      await expect(investigationFlyout).toBeVisible({ timeout: 60_000 });
      await investigationFlyout.getByTestId('investigationSubject-alert').first().click();
      await settle(page, 'nightshiftEventAlertFlyoutStatus');
      await expect(page.testSubj.locator('nightshiftEventAlertFlyoutError')).toBeVisible();
      await capture(page, 'nightshift-04-event-alert-status');
    });
  });
});
