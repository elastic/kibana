/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EventLifecycleResponse,
  Feature,
  InvestigationState,
  LifecycleDetection,
  QueryOccurrencesResponse,
  SignalEntry,
  SignificantEvent,
} from '@kbn/significant-events-schema';

export const checkoutEvent: SignificantEvent = {
  '@timestamp': '2026-07-24T09:42:00.000Z',
  event_id: 'checkout-latency',
  event_uuid: 'checkout-latency-v1',
  status: 'open',
  stream_names: ['logs.checkout-api'],
  title: 'Checkout latency increased after deployment',
  summary:
    'Checkout requests are taking longer than expected. The `checkout-api` P95 latency rose from 420 ms to 2.8 s shortly after version `2026.07.24-1` was deployed. Error rates and payment retries increased during the same interval.',
  severity: '80-critical',
  confidence: 0.94,
  causal_features: [
    {
      feature_id: 'checkout-api',
      name: 'checkout-api',
      stream_name: 'logs.checkout-api',
    },
  ],
  blast_radius: [
    {
      type: 'entity',
      feature_id: 'checkout-api',
      name: 'checkout-api',
      stream_name: 'logs.checkout-api',
    },
  ],
};

export const inventoryEvent: SignificantEvent = {
  '@timestamp': '2026-07-24T08:16:00.000Z',
  event_id: 'inventory-errors',
  event_uuid: 'inventory-errors-v1',
  status: 'open',
  stream_names: ['logs.inventory-service'],
  title: 'Inventory service error rate is elevated',
  summary:
    'The inventory service is returning more `503` responses while refreshing product availability.',
  severity: '60-high',
  confidence: 0.86,
  causal_features: [
    {
      feature_id: 'inventory-service',
      name: 'inventory-service',
      stream_name: 'logs.inventory-service',
    },
  ],
  blast_radius: [
    {
      type: 'entity',
      feature_id: 'inventory-service',
      name: 'inventory-service',
      stream_name: 'logs.inventory-service',
    },
  ],
};

export const resolvedPaymentEvent: SignificantEvent = {
  '@timestamp': '2026-07-23T22:05:00.000Z',
  event_id: 'payment-timeouts',
  event_uuid: 'payment-timeouts-v2',
  status: 'closed',
  stream_names: ['logs.payment-gateway'],
  title: 'Payment gateway timeouts',
  summary: 'Payment gateway timeout rates returned to their expected baseline.',
  severity: '40-medium',
  confidence: 0.78,
  investigations: [
    {
      workflow_execution_id: 'payment-investigation',
      started_at: '2026-07-23T22:08:00.000Z',
      completed_at: '2026-07-23T22:13:00.000Z',
    },
  ],
};

export const dismissedShippingEvent: SignificantEvent = {
  '@timestamp': '2026-07-23T19:20:00.000Z',
  event_id: 'shipping-queue-depth',
  event_uuid: 'shipping-queue-depth-v1',
  status: 'dismissed',
  stream_names: ['logs.shipping-service'],
  title: 'Shipping queue depth briefly increased',
  summary: 'The queue increase was caused by a planned batch import and requires no action.',
  severity: '20-low',
  confidence: 0.65,
};

export const nightshiftEvents: SignificantEvent[] = [
  checkoutEvent,
  inventoryEvent,
  resolvedPaymentEvent,
];

export const checkoutDetectionSignal: SignalEntry = {
  type: 'detection',
  stream_name: 'logs.checkout-api',
  description:
    'P95 latency for `checkout-api` rose from 420 ms to 2.8 s immediately after the latest deployment.',
  evidence: {
    esql_query:
      'FROM logs.checkout-api\n| STATS p95_latency = PERCENTILE(transaction.duration, 95) BY DATE_TRUNC(5 minutes, @timestamp)',
    result: 'found',
  },
  metadata: {
    detection_id: 'checkout-latency-detection',
    rule_uuid: 'checkout-latency-rule',
    rule_name: 'checkout-api-p95-latency',
    change_point_type: 'spike',
    p_value: 0.003,
  },
};

export const checkoutEventWithSignals: SignificantEvent = {
  ...checkoutEvent,
  signals: [checkoutDetectionSignal],
};

export const checkoutDetection: LifecycleDetection = {
  detection_id: 'checkout-latency-detection',
  rule_name: 'checkout-api-p95-latency',
  rule_uuid: 'checkout-latency-rule',
  stream_name: 'logs.checkout-api',
  change_point_type: 'spike',
  '@timestamp': '2026-07-24T09:42:00.000Z',
};

export const checkoutLifecycle: EventLifecycleResponse = {
  detections: [checkoutDetection],
  events: [checkoutEventWithSignals],
};

export const checkoutOccurrences: QueryOccurrencesResponse = {
  queries: [
    {
      id: 'checkout-api-p95-latency',
      type: 'match',
      title: 'Checkout API P95 latency',
      description: 'Tracks checkout latency alerts.',
      esql: {
        query: 'FROM logs.checkout-api | STATS p95_latency = PERCENTILE(transaction.duration, 95)',
      },
      severity_score: 80,
      rule_uuid: checkoutDetection.rule_uuid ?? 'checkout-latency-rule',
      stream_name: checkoutDetection.stream_name,
      occurrences: [
        { date: '2026-07-24T09:20:00.000Z', count: 2 },
        { date: '2026-07-24T09:25:00.000Z', count: 3 },
        { date: '2026-07-24T09:30:00.000Z', count: 4 },
        { date: '2026-07-24T09:35:00.000Z', count: 7 },
        { date: '2026-07-24T09:40:00.000Z', count: 15 },
        { date: '2026-07-24T09:45:00.000Z', count: 9 },
      ],
      change_points: { type: {} },
      rule_backed: true,
    },
  ],
  aggregated_occurrences: [
    { date: '2026-07-24T09:20:00.000Z', count: 2 },
    { date: '2026-07-24T09:25:00.000Z', count: 3 },
    { date: '2026-07-24T09:30:00.000Z', count: 4 },
    { date: '2026-07-24T09:35:00.000Z', count: 7 },
    { date: '2026-07-24T09:40:00.000Z', count: 15 },
    { date: '2026-07-24T09:45:00.000Z', count: 9 },
  ],
};

export const checkoutFeature: Feature = {
  uuid: 'checkout-api',
  id: 'checkout-api-service',
  stream_name: 'logs.checkout-api',
  type: 'entity',
  subtype: 'service',
  title: 'checkout-api',
  description:
    'The checkout API validates carts, reserves inventory, and initiates payment requests.',
  properties: {
    'service.name': 'checkout-api',
  },
  confidence: 94,
  evidence: ['service.name = checkout-api', 'deployment.environment = production'],
  meta: {
    related_apm_service: 'checkout-api',
  },
};

export const completedInvestigation = {
  workflow_execution_id: 'checkout-investigation',
  started_at: '2026-07-24T09:45:00.000Z',
  completed_at: '2026-07-24T09:51:00.000Z',
} satisfies NonNullable<SignificantEvent['investigations']>[number];

export const runningInvestigation = {
  workflow_execution_id: 'checkout-investigation-running',
  started_at: '2026-07-24T09:45:00.000Z',
} satisfies NonNullable<SignificantEvent['investigations']>[number];

export const completedInvestigationState: InvestigationState = {
  summary: 'Investigate the latency spike affecting checkout requests.',
  hypotheses: [
    {
      candidate: 'The latest checkout deployment introduced a database lookup regression',
      confidence: 0.92,
      status: 'confirmed',
      reason:
        'Database query time increased immediately after the deployment while upstream dependency latency remained stable.',
    },
    {
      candidate: 'Payment gateway latency is slowing checkout requests',
      confidence: 0.34,
      status: 'dismissed',
      reason: 'Payment gateway response times remained within their normal range.',
    },
  ],
  conclusion: `# Conclusion
The latest checkout deployment introduced a synchronous inventory lookup that increased request latency.

## Next Steps
- Roll back the checkout deployment · Revert version 2026.07.24-1 and monitor P95 latency.
- Add a deployment guardrail · Block releases when checkout latency exceeds the service baseline.`,
  gaps_found: [
    'Missing database spans · The slow inventory query is not represented in distributed traces.',
    'Limited deployment metadata · Commit identifiers are not included in checkout logs.',
  ],
};

export const runningInvestigationState: InvestigationState = {
  summary: 'Determine what caused checkout latency to increase after the latest deployment.',
  hypotheses: [
    {
      candidate: 'The latest checkout deployment introduced a database lookup regression',
      confidence: 0.78,
      status: 'investigating',
      reason: 'Comparing database spans before and after the deployment.',
    },
    {
      candidate: 'Payment gateway latency is slowing checkout requests',
      confidence: 0.31,
      status: 'investigating',
      reason: 'Checking payment gateway response-time distributions.',
    },
  ],
};

export const entityWithoutEvidence: Feature = {
  ...checkoutFeature,
  uuid: 'checkout-host',
  id: 'checkout-host',
  subtype: 'host',
  title: 'checkout-host-01',
  description: 'A checkout host with no supporting evidence attached.',
  confidence: 48,
  evidence: [],
};

export const streamOnlyEntity: Feature = {
  ...checkoutFeature,
  uuid: 'logs-checkout-api',
  id: 'logs.checkout-api',
  subtype: 'stream',
  title: 'logs.checkout-api',
  description: 'The source stream associated with the checkout latency detection.',
  confidence: 0,
  evidence: [],
};
