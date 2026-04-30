/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/synthtrace-client';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const SIGEVENTS_EVENTS_INDEX = 'sigevents-events-ms';
const SIGEVENTS_DETECTIONS_INDEX = 'sigevents-detections-ms';

test.describe(
  'Sigevents Overview Page',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, apmSynthtraceEsClient }) => {
      await esClient.deleteByQuery({
        index: SIGEVENTS_EVENTS_INDEX,
        refresh: true,
        query: { prefix: { event_id: 'scout-event-' } },
      });
      await esClient.deleteByQuery({
        index: SIGEVENTS_DETECTIONS_INDEX,
        refresh: true,
        query: { prefix: { detection_id: 'scout-det-' } },
      });
      await apmSynthtraceEsClient.clean();
    });

    test('no critical events — shows healthy overview with lower priority events', async ({
      page,
      kbnUrl,
      esClient,
      apmSynthtraceEsClient,
    }) => {
      await test.step('seed test data — acknowledged events only (no promoted)', async () => {
        const now = new Date();
        const timestamp = now.toISOString();

        // Remove any promoted events so the page renders in healthy state
        await esClient.updateByQuery({
          index: SIGEVENTS_EVENTS_INDEX,
          refresh: true,
          script: {
            source: "ctx._source.verdict = 'demoted'",
            lang: 'painless',
          },
          query: { term: { verdict: 'promoted' } },
        });

        // Seed acknowledged events (lower priority)
        const acknowledgedEventDocs = [
          {
            '@timestamp': timestamp,
            event_id: 'scout-event-stderr-output',
            verdict_id: 'scout-verdict-stderr-output',
            discovery_id: 'scout-disc-stderr-output',
            discovery_slug: 'multi-service__stderr-output-across-services',
            verdict: 'acknowledged',
            title: 'multi-service — elevated stderr output',
            summary:
              'Stderr output across services shifted at 19:28Z with high sustained volume (2031 alerts). Direct keyword search for stderr text returned no hits in the same stream.',
            root_cause:
              'Multiple services are emitting more stderr-formatted output, consistent with increased exception/stack-trace style logging.',
            rule_names: ['Stderr output across services'],
            stream_names: ['logs.otel'],
            cause_kis: [],
            evidences: [],
            criticality: 40,
            impact: 'medium',
            recommended_action: 'investigate',
            recommendations: [
              'Query logs.otel using a stats aggregation on resource.attributes.app to identify which services are generating the increased output volume.',
              'Inspect log level distribution in logs.otel over the last hour using severity_text fields.',
            ],
            last_reviewed_at: timestamp,
          },
          {
            '@timestamp': timestamp,
            event_id: 'scout-event-otel-retries',
            verdict_id: 'scout-verdict-otel-retries',
            discovery_id: 'scout-disc-otel-retries',
            discovery_slug: 'otel-collector__otel-exporter-retry-activity',
            verdict: 'acknowledged',
            title: 'otel-collector — OTLP exporter retries',
            summary:
              'OTel exporter retry activity spiked at 19:28Z (3 alerts). Dependencies in this environment show multiple services exporting to the otel-collector.',
            root_cause:
              'Telemetry exporters are retrying because the otel-collector endpoint is unavailable to clients (transport-level connection failures).',
            rule_names: ['OTel exporter retry activity'],
            stream_names: ['logs.otel'],
            dependency_edges: [
              {
                exposure: 'exposed',
                protocol: 'grpc',
                source: 'recommendation',
                target: 'otel-collector',
              },
            ],
            cause_kis: [],
            evidences: [],
            criticality: 30,
            impact: 'low',
            recommended_action: 'monitor',
            recommendations: [
              'Verify otel-collector pod health and readiness in the otel-demo namespace.',
              'Inspect recommendation service logs for StatusCode.UNAVAILABLE export errors.',
            ],
            last_reviewed_at: timestamp,
          },
        ];

        await esClient.bulk({
          refresh: 'wait_for',
          operations: acknowledgedEventDocs.flatMap((doc) => [
            { index: { _index: SIGEVENTS_EVENTS_INDEX } },
            doc,
          ]),
        });

        // Seed detections (non-superseded so counts appear)
        const detectionDocs = [
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-stderr',
            parent_detection_id: '',
            rule_name: 'Stderr output across services',
            rule_uuid: '4d80d275-02b7-5503-8764-e72663b75879',
            stream: 'logs.otel',
            alert_count: 2065,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-otel-retry',
            parent_detection_id: '',
            rule_name: 'OTel exporter retry activity',
            rule_uuid: 'e2f233d1-c56e-51af-8b05-4422b645a8d4',
            stream: 'logs.otel',
            alert_count: 3,
          },
        ];

        await esClient.bulk({
          refresh: 'wait_for',
          operations: detectionDocs.flatMap((doc) => [
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
        await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
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
        const eventLink = page.getByRole('link', {
          name: 'multi-service — elevated stderr output',
        });
        await expect(eventLink).toBeVisible();
        await eventLink.click();

        await expect(page.getByTestId('eventDetailFlyout')).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'multi-service — elevated stderr output' })
        ).toBeVisible();
      });

      await test.step('close the flyout', async () => {
        await page.getByTestId('eventDetailFlyout').getByRole('button', { name: 'Close' }).click();
        await expect(page.getByTestId('eventDetailFlyout')).toBeHidden();
      });

      await test.step('click Go to Significant events and verify KIs page', async () => {
        await page.getByTestId('sigeventsViewAllKnowledgeIndicators').click();
        await page.waitForURL('**/app/streams/_discovery/knowledge_indicators');
        await expect(page).toHaveURL(/\/app\/streams\/_discovery\/knowledge_indicators/);
      });

      await test.step('restore promoted events', async () => {
        // Restore any events that were demoted during this test
        await esClient.updateByQuery({
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
      });
    });

    test('renders populated overview with seeded data', async ({
      page,
      kbnUrl,
      esClient,
      apmSynthtraceEsClient,
    }) => {
      await test.step('seed test data into Elasticsearch', async () => {
        const now = new Date();
        const timestamp = now.toISOString();

        // Index promoted significant events
        const promotedEventDocs = [
          {
            '@timestamp': timestamp,
            event_id: 'scout-event-payment-failures',
            discovery_id: 'scout-disc-payment-failures',
            discovery_slug: 'payment__payment-processing-failures',
            verdict: 'promoted',
            title: 'payment — charge processing failures',
            summary:
              'The payment processing failures rule is firing at high volume (2,528 events) with a stable pattern and is re-firing after a brief clear. Recent log matches show repeated charge failures driven by downstream connection-refused errors during gRPC calls.',
            root_cause:
              'Payment processing is failing because the payment service cannot establish a connection to its downstream card-charging dependency (connection refused), leading to gRPC Unavailable/INTERNAL charge failures. Checkout is exposed because it depends on payment for order placement (checkout → payment).',
            rule_names: ['Payment processing failures'],
            stream_names: ['logs.otel'],
            dependency_edges: [
              {
                protocol: 'internal',
                exposure: 'exposed',
                source: 'checkout',
                target: 'payment',
              },
            ],
            cause_kis: [{ stream_name: 'logs.otel', name: 'payment-service' }],
            evidences: [
              {
                result: 'found',
                stream_name: 'logs.otel',
                rule_name: 'Payment processing failures',
                description:
                  'Matched recent payment/charge error logs showing gRPC charge failures where the downstream dial attempt is refused.',
                esql_query:
                  'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE ((body.text : "payment") OR (body.text : "charge")) AND ((body.text : "fail") OR (body.text : "error") OR (body.text : "refused")) | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
                confirmed: true,
                row_count: 5,
                collected_at: timestamp,
              },
            ],
            criticality: 90,
            recommended_action: 'escalate',
            impact: 'critical',
            recommendations: [
              'Inspect the payment service downstream card-charge dependency — verify the target host and port are reachable.',
              'Check checkout service error rates and order placement success.',
              'Query logs.otel for payment and charge error logs filtered to the last 30 minutes.',
            ],
            verdict_id: 'scout-verdict-payment-failures',
            last_reviewed_at: timestamp,
          },
          {
            '@timestamp': timestamp,
            event_id: 'scout-event-grpc-connection',
            discovery_id: 'scout-disc-grpc-connection',
            discovery_slug: 'frontend__grpc-connection-refused-errors',
            verdict: 'promoted',
            title: 'frontend — gRPC connection failures',
            summary:
              'The gRPC connection refused errors rule spiked starting around the 19:00 window (peak 22 alerts/30m). Recent log matches show repeated ECONNREFUSED leading to gRPC UNAVAILABLE client failures during backend calls.',
            root_cause:
              'The frontend is encountering gRPC UNAVAILABLE errors because a downstream gRPC backend is refusing TCP connections (ECONNREFUSED), preventing the frontend API routes from completing backend calls.',
            rule_names: ['gRPC connection refused errors'],
            stream_names: ['logs.otel'],
            dependency_edges: [
              {
                protocol: 'grpc',
                exposure: 'not_exposed',
                source: 'frontend',
                target: 'cart',
              },
            ],
            cause_kis: [{ stream_name: 'logs.otel', name: 'frontend' }],
            evidences: [
              {
                result: 'found',
                stream_name: 'logs.otel',
                rule_name: 'gRPC connection refused errors',
                description:
                  'Matched recent gRPC client errors where requests fail with ECONNREFUSED and gRPC UNAVAILABLE when trying to connect to a backend endpoint.',
                esql_query:
                  'FROM logs.otel, logs.otel.* | WHERE @timestamp >= NOW() - 120 minutes AND @timestamp <= NOW() | WHERE body.text : "ECONNREFUSED" | KEEP @timestamp, body.text | SORT @timestamp DESC | LIMIT 5',
                confirmed: true,
                row_count: 5,
                collected_at: timestamp,
              },
            ],
            criticality: 70,
            recommended_action: 'escalate',
            impact: 'high',
            recommendations: [
              'Verify cart service pod health and port 7070 availability in the otel-demo namespace.',
              'Check frontend API route error rates for the cart endpoint.',
              'Query logs.otel filtered to ECONNREFUSED in the last 30 minutes.',
            ],
            verdict_id: 'scout-verdict-grpc-connection',
            last_reviewed_at: timestamp,
          },
        ];

        await esClient.bulk({
          refresh: 'wait_for',
          operations: promotedEventDocs.flatMap((doc) => [
            { index: { _index: SIGEVENTS_EVENTS_INDEX } },
            doc,
          ]),
        });

        // Index acknowledged events
        const acknowledgedEventDocs = [
          {
            '@timestamp': timestamp,
            event_id: 'scout-event-stderr-output',
            verdict_id: 'scout-verdict-stderr-output',
            discovery_id: 'scout-disc-stderr-output',
            discovery_slug: 'multi-service__stderr-output-across-services',
            verdict: 'acknowledged',
            title: 'multi-service — elevated stderr output',
            summary:
              'Stderr output across services shifted at 19:28Z with high sustained volume (2031 alerts). Direct keyword search for stderr text returned no hits in the same stream.',
            root_cause:
              'Multiple services are emitting more stderr-formatted output, consistent with increased exception/stack-trace style logging.',
            rule_names: ['Stderr output across services'],
            stream_names: ['logs.otel'],
            cause_kis: [],
            evidences: [],
            criticality: 40,
            impact: 'medium',
            recommended_action: 'investigate',
            recommendations: [
              'Query logs.otel using a stats aggregation on resource.attributes.app to identify which services are generating the increased output volume.',
              'Inspect log level distribution in logs.otel over the last hour using severity_text fields.',
            ],
            last_reviewed_at: timestamp,
          },
          {
            '@timestamp': timestamp,
            event_id: 'scout-event-otel-retries',
            verdict_id: 'scout-verdict-otel-retries',
            discovery_id: 'scout-disc-otel-retries',
            discovery_slug: 'otel-collector__otel-exporter-retry-activity',
            verdict: 'acknowledged',
            title: 'otel-collector — OTLP exporter retries',
            summary:
              'OTel exporter retry activity spiked at 19:28Z (3 alerts). Dependencies in this environment show multiple services exporting to the otel-collector.',
            root_cause:
              'Telemetry exporters are retrying because the otel-collector endpoint is unavailable to clients (transport-level connection failures).',
            rule_names: ['OTel exporter retry activity'],
            stream_names: ['logs.otel'],
            dependency_edges: [
              {
                exposure: 'exposed',
                protocol: 'grpc',
                source: 'recommendation',
                target: 'otel-collector',
              },
              {
                exposure: 'exposed',
                protocol: 'http',
                source: 'ad',
                target: 'otel-collector',
              },
            ],
            cause_kis: [],
            evidences: [],
            criticality: 30,
            impact: 'low',
            recommended_action: 'monitor',
            recommendations: [
              'Verify otel-collector pod health and readiness in the otel-demo namespace.',
              'Inspect recommendation service logs for StatusCode.UNAVAILABLE export errors.',
            ],
            last_reviewed_at: timestamp,
          },
        ];

        await esClient.bulk({
          refresh: 'wait_for',
          operations: acknowledgedEventDocs.flatMap((doc) => [
            { index: { _index: SIGEVENTS_EVENTS_INDEX } },
            doc,
          ]),
        });

        // Index detections — mix of superseded and active
        const detectionDocs = [
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-payment-failures',
            parent_detection_id: '',
            rule_name: 'Payment processing failures',
            rule_uuid: '9997139f-d644-5456-93c5-31e6e4ce8920',
            stream: 'logs.otel',
            alert_count: 2040,
            superseded: true,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-grpc-errors',
            parent_detection_id: '',
            rule_name: 'gRPC connection refused errors',
            rule_uuid: '6c3d74de-8a5a-5579-bd04-ceeca719594b',
            stream: 'logs.otel',
            alert_count: 22,
            superseded: true,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-otel-retry',
            parent_detection_id: '',
            rule_name: 'OTel exporter retry activity',
            rule_uuid: 'e2f233d1-c56e-51af-8b05-4422b645a8d4',
            stream: 'logs.otel',
            alert_count: 3,
            superseded: true,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-stderr',
            parent_detection_id: '',
            rule_name: 'Stderr output across services',
            rule_uuid: '4d80d275-02b7-5503-8764-e72663b75879',
            stream: 'logs.otel',
            alert_count: 2065,
            superseded: true,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-valkey-persistence',
            parent_detection_id: '',
            rule_name: 'Valkey database persistence events',
            rule_uuid: '6b1e9a78-eae9-5de3-8d21-2b5de2430268',
            stream: 'logs.otel',
            alert_count: 33,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-credit-card',
            parent_detection_id: '',
            rule_name: 'Credit card data exposure in logs',
            rule_uuid: '62003d67-8333-59e3-85f8-357e3d9e4b90',
            stream: 'logs.otel',
            alert_count: 1,
          },
          {
            '@timestamp': timestamp,
            detection_id: 'scout-det-shipping',
            parent_detection_id: '',
            rule_name: 'Shipping tracking ID creation',
            rule_uuid: '5ac6413d-55be-5dd3-91f2-1621215b4ef2',
            stream: 'logs.otel',
            alert_count: 1,
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
        await expect(page.getByTestId('obltSigeventsOverviewPageHeader')).toBeVisible();
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
