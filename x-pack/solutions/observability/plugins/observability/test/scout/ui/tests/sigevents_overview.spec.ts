/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: This suite runs sequentially (not alongside `parallel_tests/`) because it
 * toggles the `observability.sigeventsOverviewEnabled` feature flag, which is
 * server-wide. Placing it in `parallel_tests/` would cause the flag change to
 * spill into other parallel workers.
 *
 * Tests run in order: first with flag enabled, then with flag disabled.
 */

import { apm, timerange } from '@kbn/synthtrace-client';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const SIGEVENTS_FEATURE_FLAG = 'observability.sigeventsOverviewEnabled';
const sigEventsFeatureFlagInitalValue = true;

const SIGEVENTS_EVENTS_INDEX = 'sigevents-events-ms';
const SIGEVENTS_VERDICTS_INDEX = 'sigevents-verdicts-ms';
const SIGEVENTS_DETECTIONS_INDEX = 'sigevents-detections-ms';

test.describe(
  'Sigevents Overview Page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: sigEventsFeatureFlagInitalValue,
        },
      });
    });

    test('shows sigevents overview with inline conversation when flag is enabled', async ({
      page,
      kbnUrl,
      apiServices,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: true,
        },
      });

      await page.goto(kbnUrl.get('/app/observability/overview'));

      await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
      await expect(page.getByTestId('sigeventsOverview')).toBeVisible();
      await expect(page.getByTestId('obltSigeventsConversation')).toBeVisible();
      await expect(page.getByTestId('agentBuilderEmbeddableConversation')).toBeVisible();
    });

    test('landing page redirects to sigevents when flag is enabled', async ({
      page,
      kbnUrl,
      apiServices,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: true,
        },
      });

      await page.goto(kbnUrl.get('/app/observability/landing'));

      await expect(page).toHaveURL(/\/app\/observability\/overview/);
      await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
    });

    test('shows default overview when flag is disabled', async ({ page, kbnUrl, apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          [SIGEVENTS_FEATURE_FLAG]: false,
        },
      });

      await page.goto(kbnUrl.get('/app/observability/overview'));

      await expect(page.getByTestId('obltOverviewPageHeader')).toBeVisible();
    });

    test('renders populated overview with seeded data', async ({
      page,
      kbnUrl,
      apiServices,
      esClient,
      apmSynthtraceEsClient,
    }) => {
      await test.step('seed test data into Elasticsearch', async () => {
        const now = new Date();
        const timestamp = now.toISOString();

        // Index a promoted significant event
        await esClient.index({
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: 'wait_for',
          document: {
            '@timestamp': timestamp,
            event_id: 'scout-smoke-event-1',
            discovery_id: 'scout-smoke-discovery-1',
            discovery_slug: 'scout-smoke-slug',
            verdict: 'promoted',
            title: 'Latency spike in checkout service',
            summary:
              'p99 latency increased by 300% in the checkout service over the last 15 minutes.',
            root_cause: 'Database connection pool exhaustion',
            rule_names: ['latency_threshold'],
            stream_names: ['checkout', 'payment'],
            blast_radius: [
              {
                ki_id: 'checkout-svc',
                name: 'checkout',
                stream_name: 'checkout',
                confirmed: true,
              },
              {
                ki_id: 'payment-svc',
                name: 'payment',
                stream_name: 'payment',
                confirmed: true,
              },
            ],
            cause_kis: [
              {
                ki_id: 'db-pool',
                name: 'postgres',
                stream_name: 'database',
                confirmed: true,
              },
            ],
            criticality: 85,
            recommended_action: 'escalate',
            impact: 'critical',
            recommendations: ['Scale up database connection pool', 'Investigate slow queries'],
            verdict_id: 'scout-verdict-promoted-1',
            last_reviewed_at: timestamp,
          },
        });

        // Index verdicts (non-promoted) for lower-priority list and impact counts
        const verdictDocs = [
          {
            '@timestamp': timestamp,
            verdict_id: 'scout-verdict-high-1',
            discovery_id: 'scout-disc-2',
            discovery_slug: 'scout-slug-2',
            verdict: 'acknowledged',
            title: 'Elevated error rate in auth service',
            summary: 'Error rate exceeded 5% threshold.',
            root_cause: 'Upstream dependency timeout',
            rule_names: ['error_rate_threshold'],
            stream_names: ['auth'],
            criticality: 70,
            confidence: 0.9,
            impact: 'high',
            recommended_action: 'monitor',
            verdict_summary: 'Auth service errors spiking',
          },
          {
            '@timestamp': timestamp,
            verdict_id: 'scout-verdict-medium-1',
            discovery_id: 'scout-disc-3',
            discovery_slug: 'scout-slug-3',
            verdict: 'acknowledged',
            title: 'Gradual memory increase in API gateway',
            summary: 'Memory usage trending upward over the past 2 hours.',
            root_cause: 'Potential memory leak',
            rule_names: ['memory_usage'],
            stream_names: ['api-gateway'],
            criticality: 45,
            confidence: 0.75,
            impact: 'medium',
            recommended_action: 'monitor',
            verdict_summary: 'API gateway memory leak',
          },
          {
            '@timestamp': timestamp,
            verdict_id: 'scout-verdict-low-1',
            discovery_id: 'scout-disc-4',
            discovery_slug: 'scout-slug-4',
            verdict: 'acknowledged',
            title: 'Minor log volume decrease in frontend',
            summary: 'Log throughput dropped by 10%.',
            root_cause: 'Reduced traffic',
            rule_names: ['log_volume'],
            stream_names: ['frontend'],
            criticality: 15,
            confidence: 0.6,
            impact: 'low',
            recommended_action: 'resolve',
            verdict_summary: 'Frontend log volume dip',
          },
        ];

        await esClient.bulk({
          refresh: 'wait_for',
          operations: verdictDocs.flatMap((doc) => [
            { index: { _index: SIGEVENTS_VERDICTS_INDEX } },
            doc,
          ]),
        });

        // Index detections
        const detectionDocs = [
          {
            '@timestamp': timestamp,
            detection_id: 'det-1',
            title: 'Latency anomaly',
            superseded: false,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'det-2',
            title: 'Error spike',
            superseded: false,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'det-3',
            title: 'Old detection',
            superseded: true,
          },
        ];

        await esClient.bulk({
          refresh: 'wait_for',
          operations: detectionDocs.flatMap((doc) => [
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
                name: 'auth',
                environment: 'production',
                agentName: 'go',
              })
              .instance('auth-1')
              .transaction({ transactionName: 'POST /login' })
              .timestamp(ts)
              .duration(50)
              .success(),
          ]);

        await apmSynthtraceEsClient.index(traceData);
      });

      await test.step('enable feature flag and navigate', async () => {
        await apiServices.core.settings({
          'feature_flags.overrides': {
            [SIGEVENTS_FEATURE_FLAG]: true,
          },
        });

        await page.goto(kbnUrl.get('/app/observability/overview'));
      });

      await test.step('verify page structure loads', async () => {
        await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
        await expect(page.getByTestId('sigeventsOverview')).toBeVisible();
      });

      await test.step('verify critical status header renders', async () => {
        await expect(page.getByTestId('sigeventsOverviewStatusHeader')).toBeVisible();
      });

      await test.step('verify main significant event card with seeded data', async () => {
        await expect(page.getByTestId('sigeventsOverviewMainSignificantEvent')).toBeVisible();
        await expect(page.getByText('Latency spike in checkout service')).toBeVisible();
      });

      await test.step('verify impacted cards render', async () => {
        await expect(page.getByTestId('sigeventsOverviewImpactedCards')).toBeVisible();
      });

      await test.step('verify conversation container renders', async () => {
        await expect(page.getByTestId('obltSigeventsConversation')).toBeVisible();
      });

      await test.step('clean up seeded data', async () => {
        await esClient.deleteByQuery({
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          query: { term: { event_id: 'scout-smoke-event-1' } },
        });
        await esClient.deleteByQuery({
          index: SIGEVENTS_VERDICTS_INDEX,
          refresh: true,
          query: { prefix: { verdict_id: 'scout-verdict-' } },
        });
        await esClient.deleteByQuery({
          index: SIGEVENTS_DETECTIONS_INDEX,
          refresh: true,
          query: { prefix: { detection_id: 'det-' } },
        });
        await apmSynthtraceEsClient.clean();
      });
    });
  }
);
