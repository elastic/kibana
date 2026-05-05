/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/synthtrace-client';
import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import {
  SIGEVENTS_EVENTS_INDEX,
  SIGEVENTS_DETECTIONS_INDEX,
  makeAcknowledgedEvents,
  makeAct1Detections,
  makePromotedEvents,
  makeAct2AcknowledgedEvents,
  makeAct2Detections,
} from '../../../fixtures/sigevents_test_data';

const SIGEVENTS_FEATURE_FLAG = 'observability.sigeventsOverviewEnabled';

/**
 * Safely run deleteByQuery/updateByQuery on an index that may not exist.
 * Catches index_not_found errors and ignores them.
 */
async function safeDeleteByQuery(esClient: Client, params: Parameters<Client['deleteByQuery']>[0]) {
  try {
    await esClient.deleteByQuery(params);
  } catch (e) {
    const isNotFound = (e as { meta?: { statusCode?: number } }).meta?.statusCode === 404;
    if (!isNotFound) throw e;
    // Index does not exist — nothing to delete
  }
}

async function safeUpdateByQuery(esClient: Client, params: Parameters<Client['updateByQuery']>[0]) {
  try {
    await esClient.updateByQuery(params);
  } catch (e) {
    const isNotFound = (e as { meta?: { statusCode?: number } }).meta?.statusCode === 404;
    if (!isNotFound) throw e;
    // Index does not exist — nothing to update
  }
}

/**
 * Ensure an index exists with explicit keyword mappings for fields used in
 * aggregations and term queries. If the index already exists this is a no-op.
 */
async function ensureIndex(
  esClient: Client,
  index: string,
  properties: Record<string, MappingProperty>
) {
  const exists = await esClient.indices.exists({ index });
  if (exists) {
    // Verify the mapping is correct by checking if it has the expected field types.
    // If the index was auto-created with wrong mappings, delete and recreate it.
    const mapping = await esClient.indices.getMapping({ index });
    const currentProps = mapping[index]?.mappings?.properties ?? {};
    const needsRecreate = Object.entries(properties).some(
      ([field, expected]) => currentProps[field]?.type !== expected.type
    );
    if (needsRecreate) {
      await esClient.indices.delete({ index });
    } else {
      return;
    }
  }
  await esClient.indices.create({
    index,
    mappings: { properties },
  });
}

test.describe(
  'SKO FY27 Demo: Significant Events',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await ensureIndex(esClient, SIGEVENTS_EVENTS_INDEX, {
        '@timestamp': { type: 'date' },
        impact: { type: 'keyword' },
        verdict: { type: 'keyword' },
        event_id: { type: 'keyword' },
        recommended_action: { type: 'keyword' },
        criticality: { type: 'integer' },
      });
      await ensureIndex(esClient, SIGEVENTS_DETECTIONS_INDEX, {
        '@timestamp': { type: 'date' },
        detection_id: { type: 'keyword' },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: true,
        },
      });
    });

    test.afterAll(async ({ esClient, apmSynthtraceEsClient }) => {
      // Restore any events that were demoted during tests
      await safeUpdateByQuery(esClient, {
        index: SIGEVENTS_EVENTS_INDEX,
        refresh: true,
        script: {
          source: "ctx._source.verdict = 'promoted'",
          lang: 'painless',
        },
        query: {
          bool: {
            must: [{ term: { verdict: 'demoted' } }],
            must_not: [{ prefix: { event_id: 'scout-event-' } }],
          },
        },
      });
      await safeDeleteByQuery(esClient, {
        index: SIGEVENTS_EVENTS_INDEX,
        refresh: true,
        query: { prefix: { event_id: 'scout-event-' } },
      });
      await safeDeleteByQuery(esClient, {
        index: SIGEVENTS_DETECTIONS_INDEX,
        refresh: true,
        query: { prefix: { detection_id: 'scout-det-' } },
      });
      await apmSynthtraceEsClient.clean();
    });

    test('Act 0: No Detection Workflows', async ({ page, kbnUrl, esClient }) => {
      await test.step('clean up stale test data', async () => {
        await safeDeleteByQuery(esClient, {
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          query: { prefix: { event_id: 'scout-event-' } },
        });
        await safeDeleteByQuery(esClient, {
          index: SIGEVENTS_DETECTIONS_INDEX,
          refresh: true,
          query: { prefix: { detection_id: 'scout-det-' } },
        });
        await safeUpdateByQuery(esClient, {
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          script: {
            source: "ctx._source.verdict = 'demoted'",
            lang: 'painless',
          },
          query: {
            bool: {
              should: [{ term: { verdict: 'promoted' } }, { term: { verdict: 'acknowledged' } }],
              minimum_should_match: 1,
            },
          },
        });
      });

      await test.step('navigate to overview', async () => {
        await page.goto(kbnUrl.get('/app/observability/overview'));
      });

      await test.step('verify healthy state — no critical events header', async () => {
        await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible({
          timeout: 60_000,
        });
        await expect(page.getByTestId('sigeventsOverview')).toBeVisible();
        await expect(page.getByTestId('sigeventsOverviewStatusHeader')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'You have no critical significant events' })
        ).toBeVisible();
        await expect(page.getByTestId('sigeventsOverviewHealthyMetrics')).toBeVisible();
      });

      await test.step('verify no lower priority events table', async () => {
        await expect(page.getByTestId('sigeventsLowerPriorityEvents')).toBeHidden();
      });

      await test.step('verify no critical event cards', async () => {
        await expect(page.getByTestId('sigeventsOverviewMainSignificantEvent')).toBeHidden();
        await expect(page.getByTestId('sigeventsOverviewOtherPromotedEvents')).toBeHidden();
      });
    });

    test('Act 1: We Know Your System', async ({
      page,
      kbnUrl,
      esClient,
      apmSynthtraceEsClient,
    }) => {
      await test.step('seed test data — acknowledged events only (no promoted)', async () => {
        const now = new Date();
        const timestamp = now.toISOString();

        // Clean up stale test data from prior interrupted runs
        await safeDeleteByQuery(esClient, {
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          query: { prefix: { event_id: 'scout-event-' } },
        });
        await safeDeleteByQuery(esClient, {
          index: SIGEVENTS_DETECTIONS_INDEX,
          refresh: true,
          query: { prefix: { detection_id: 'scout-det-' } },
        });

        // Remove any promoted events so the page renders in healthy state
        await safeUpdateByQuery(esClient, {
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          script: {
            source: "ctx._source.verdict = 'demoted'",
            lang: 'painless',
          },
          query: { term: { verdict: 'promoted' } },
        });

        await esClient.bulk({
          refresh: 'wait_for',
          operations: makeAcknowledgedEvents(timestamp).flatMap((doc) => [
            { index: { _index: SIGEVENTS_EVENTS_INDEX } },
            doc,
          ]),
        });

        await esClient.bulk({
          refresh: 'wait_for',
          operations: makeAct1Detections(timestamp).flatMap((doc) => [
            { index: { _index: SIGEVENTS_DETECTIONS_INDEX } },
            doc,
          ]),
        });

        // Generate APM traces so service count is populated
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        const traceData = timerange(fifteenMinutesAgo, Date.now())
          .interval('1m')
          .rate(1)
          .generator((ts) => [
            apm
              .service({
                name: 'payment',
                environment: 'production',
                agentName: 'java',
              })
              .instance('payment-1')
              .transaction({ transactionName: 'POST /charge' })
              .timestamp(ts)
              .duration(150)
              .success(),
            apm
              .service({
                name: 'frontend',
                environment: 'production',
                agentName: 'nodejs',
              })
              .instance('frontend-1')
              .transaction({ transactionName: 'GET /' })
              .timestamp(ts)
              .duration(100)
              .success(),
            apm
              .service({
                name: 'checkout',
                environment: 'production',
                agentName: 'nodejs',
              })
              .instance('checkout-1')
              .transaction({ transactionName: 'POST /checkout' })
              .timestamp(ts)
              .duration(200)
              .success(),
          ]);

        await apmSynthtraceEsClient.index(traceData);
      });

      await test.step('navigate to overview', async () => {
        await page.goto(kbnUrl.get('/app/observability/overview'));
      });

      await test.step('verify healthy state — no critical events header', async () => {
        await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible({
          timeout: 60_000,
        });
        await expect(page.getByTestId('sigeventsOverview')).toBeVisible();
        await expect(page.getByTestId('sigeventsOverviewStatusHeader')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'You have no critical significant events' })
        ).toBeVisible();
      });

      await test.step('verify healthy metrics are shown', async () => {
        await expect(page.getByTestId('sigeventsOverviewHealthyMetrics')).toBeVisible();
      });

      await test.step('verify lower priority events table is shown', async () => {
        await expect(page.getByTestId('sigeventsLowerPriorityEvents')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'Lower priority items to review' })
        ).toBeVisible();
      });

      await test.step('click on an event to open the flyout', async () => {
        const lowerPriorityPanel = page.getByTestId('sigeventsLowerPriorityEvents');
        const row = lowerPriorityPanel
          .getByRole('row')
          .filter({ hasText: 'elevated stderr output' });
        const expandButton = row.getByRole('button', { name: /view details/i });
        await expect(expandButton).toBeVisible();
        await expandButton.click();

        await expect(page.getByTestId('eventDetailFlyout')).toBeVisible();
      });

      await test.step('close the flyout', async () => {
        await page.getByTestId('eventDetailFlyout').getByRole('button', { name: /close/i }).click();
        await expect(page.getByTestId('eventDetailFlyout')).toBeHidden();
      });

      await test.step('click Go to Significant events and verify KIs page', async () => {
        await page.getByTestId('sigeventsViewAllKnowledgeIndicators').click();
        await page.waitForURL('**/app/streams/_discovery/knowledge_indicators');
        await expect(page).toHaveURL(/\/app\/streams\/_discovery\/knowledge_indicators/);
      });
    });

    test('Act 2: Something Is Wrong', async ({ page, kbnUrl, esClient, apmSynthtraceEsClient }) => {
      await test.step('seed test data into Elasticsearch', async () => {
        const now = new Date();
        const timestamp = now.toISOString();

        // Clean up stale test data from prior interrupted runs
        await safeDeleteByQuery(esClient, {
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          query: { prefix: { event_id: 'scout-event-' } },
        });
        await safeDeleteByQuery(esClient, {
          index: SIGEVENTS_DETECTIONS_INDEX,
          refresh: true,
          query: { prefix: { detection_id: 'scout-det-' } },
        });

        await esClient.bulk({
          refresh: 'wait_for',
          operations: makePromotedEvents(timestamp).flatMap((doc) => [
            { index: { _index: SIGEVENTS_EVENTS_INDEX } },
            doc,
          ]),
        });

        await esClient.bulk({
          refresh: 'wait_for',
          operations: makeAct2AcknowledgedEvents(timestamp).flatMap((doc) => [
            { index: { _index: SIGEVENTS_EVENTS_INDEX } },
            doc,
          ]),
        });

        await esClient.bulk({
          refresh: 'wait_for',
          operations: makeAct2Detections(timestamp).flatMap((doc) => [
            { index: { _index: SIGEVENTS_DETECTIONS_INDEX } },
            doc,
          ]),
        });

        // Generate APM traces so the services aggregation returns data
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        const traceData = timerange(fifteenMinutesAgo, Date.now())
          .interval('1m')
          .rate(1)
          .generator((ts) => [
            apm
              .service({
                name: 'payment',
                environment: 'production',
                agentName: 'java',
              })
              .instance('payment-1')
              .transaction({ transactionName: 'POST /charge' })
              .timestamp(ts)
              .duration(150)
              .success(),
            apm
              .service({
                name: 'checkout',
                environment: 'production',
                agentName: 'nodejs',
              })
              .instance('checkout-1')
              .transaction({ transactionName: 'POST /checkout' })
              .timestamp(ts)
              .duration(200)
              .success(),
            apm
              .service({
                name: 'frontend',
                environment: 'production',
                agentName: 'nodejs',
              })
              .instance('frontend-1')
              .transaction({ transactionName: 'GET /' })
              .timestamp(ts)
              .duration(100)
              .success(),
          ]);

        await apmSynthtraceEsClient.index(traceData);
      });

      await test.step('navigate to overview', async () => {
        await page.goto(kbnUrl.get('/app/observability/overview'));
      });

      await test.step('verify page structure loads', async () => {
        await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible({
          timeout: 60_000,
        });
        await expect(page.getByTestId('sigeventsOverview')).toBeVisible();
      });

      await test.step('verify critical status header renders', async () => {
        await expect(page.getByTestId('sigeventsOverviewStatusHeader')).toBeVisible();
      });

      await test.step('verify main significant event card with seeded data', async () => {
        const mainEvent = page.getByTestId('sigeventsOverviewMainSignificantEvent');
        await expect(mainEvent).toBeVisible();
        await expect(
          mainEvent.getByRole('heading', { name: 'payment — charge processing failures' })
        ).toBeVisible();
      });

      await test.step('verify other promoted events render', async () => {
        await expect(page.getByTestId('sigeventsOverviewOtherPromotedEvents')).toBeVisible();
      });

      await test.step('verify conversation container renders', async () => {
        await expect(page.getByTestId('obltSigeventsConversation')).toBeVisible();
      });
    });
  }
);
