/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds Nightshift investigations for local development. Run from the repo root:
 *
 *   node -r @kbn/setup-node-env x-pack/solutions/observability/plugins/nightshift/scripts/seed_nightshift_investigations.ts
 *
 * Add --help to list the connection flags.
 */

import { run } from '@kbn/dev-cli-runner';
import type {
  InvestigationStatus,
  InvestigationStructuredOutput,
  InvestigationSubjectType,
  InvestigationTriggerType,
  Severity,
} from '@kbn/nightshift-investigations-plugin/common';
import type {
  EvidenceChart,
  EvidenceChartAnnotation,
  EvidenceChartSeries,
  InvestigationEvidence,
  InvestigationHypothesis,
  InvestigationImpact,
  InvestigationRecommendation,
} from '@kbn/significant-events-schema';

const SO_TYPE = 'nightshift-investigation';
const TYPE_MIGRATION_VERSION = '10.4.0';
const ID_PREFIX = 'nightshift-seed-inv-';

type ImpactEntity = NonNullable<InvestigationImpact['entities']>[number];
type ChartUnit = NonNullable<EvidenceChart['y_axis']['unit']>;

interface InvestigationAttributes extends InvestigationStructuredOutput {
  title: string;
  status: InvestigationStatus;
  subject_type: InvestigationSubjectType;
  subject_id: string;
  subject_summary: string;
  trigger_type: InvestigationTriggerType;
  concurrency_key: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  executed_by: string;
  error?: string;
}

interface Subject {
  type: InvestigationSubjectType;
  id: string;
  summary: string;
}

const now = Date.now();
const iso = (minutesAgo: number): string =>
  new Date(now - minutesAgo * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');

const GIB = 1024 ** 3;

/** A time series whose last point is `endMinutesAgo` minutes ago, one point every `stepMinutes`. */
const timeSeries = (
  name: string,
  endMinutesAgo: number,
  values: number[],
  stepMinutes = 5
): EvidenceChartSeries => ({
  name,
  points: values.map((y, index) => ({
    x: iso(endMinutesAgo + (values.length - 1 - index) * stepMinutes),
    y,
  })),
});

/** A point annotation, or a range annotation when `endMinutesAgo` is set. */
const annotation = (
  minutesAgo: number,
  label: string,
  endMinutesAgo?: number
): EvidenceChartAnnotation => ({
  x: iso(minutesAgo),
  ...(endMinutesAgo !== undefined && { x_end: iso(endMinutesAgo) }),
  label,
});

const timeChart = ({
  title,
  type = 'line',
  yLabel,
  unit,
  stacked,
  series,
  annotations,
}: {
  title: string;
  type?: EvidenceChart['type'];
  yLabel: string;
  unit?: ChartUnit;
  stacked?: boolean;
  series: EvidenceChartSeries[];
  annotations?: EvidenceChartAnnotation[];
}): EvidenceChart => ({
  type,
  title,
  x_axis: { type: 'time' },
  y_axis: { label: yLabel, ...(unit && { unit }) },
  ...(stacked && { stacked }),
  series,
  ...(annotations && { annotations }),
});

const categoryChart = ({
  title,
  xLabel,
  yLabel,
  unit,
  seriesName,
  values,
}: {
  title: string;
  xLabel: string;
  yLabel: string;
  unit?: ChartUnit;
  seriesName: string;
  values: Record<string, number>;
}): EvidenceChart => ({
  type: 'bar',
  title,
  x_axis: { type: 'category', label: xLabel },
  y_axis: { label: yLabel, ...(unit && { unit }) },
  series: [{ name: seriesName, points: Object.entries(values).map(([x, y]) => ({ x, y })) }],
});

const evidence = (description: string, chart?: EvidenceChart): InvestigationEvidence => ({
  description,
  ...(chart && { chart }),
});

/** Chart-only evidence, for when the surrounding text already says what the chart shows. */
const chartEvidence = (chart: EvidenceChart): InvestigationEvidence => ({ chart });

const hypothesis = (
  candidate: string,
  confidence: number,
  status: InvestigationHypothesis['status'],
  reason: string,
  ...evidences: InvestigationEvidence[]
): InvestigationHypothesis => ({
  candidate,
  confidence,
  status,
  reason,
  ...(evidences.length > 0 && { evidence: evidences }),
});

const recommendation = (
  title: string,
  confidence: number,
  description: string,
  code?: string
): InvestigationRecommendation => ({ title, confidence, description, ...(code && { code }) });

const entity = (
  name: string,
  type: string,
  sourceSlug: string,
  featureId?: string,
  entityEvidence?: InvestigationEvidence
): ImpactEntity => ({
  name,
  type,
  source_slug: sourceSlug,
  ...(featureId && { feature_id: featureId }),
  ...(entityEvidence && { evidence: entityEvidence }),
});

const completed = ({
  severity,
  title,
  subject,
  minutesAgo,
  durationMinutes,
  triggerType = 'automatic',
  ...output
}: Required<Pick<InvestigationStructuredOutput, 'summary' | 'conclusion' | 'impact'>> &
  Pick<InvestigationStructuredOutput, 'hypotheses' | 'recommendations'> & {
    severity: Severity;
    title: string;
    subject: Subject;
    minutesAgo: number;
    durationMinutes: number;
    triggerType?: InvestigationTriggerType;
  }): InvestigationAttributes => ({
  title,
  status: 'completed',
  severity,
  subject_type: subject.type,
  subject_id: subject.id,
  subject_summary: subject.summary,
  trigger_type: triggerType,
  concurrency_key: subject.id,
  created_at: iso(minutesAgo + durationMinutes),
  started_at: iso(minutesAgo + durationMinutes - 0.1),
  completed_at: iso(minutesAgo),
  executed_by: 'elastic',
  ...output,
});

const unfinished = ({
  status,
  title,
  subject,
  minutesAgo,
  triggerType = 'automatic',
  error,
  completedMinutesAgo,
}: {
  status: Exclude<InvestigationStatus, 'completed'>;
  title: string;
  subject: Subject;
  minutesAgo: number;
  triggerType?: InvestigationTriggerType;
  error?: string;
  completedMinutesAgo?: number;
}): InvestigationAttributes => ({
  title,
  status,
  subject_type: subject.type,
  subject_id: subject.id,
  subject_summary: subject.summary,
  trigger_type: triggerType,
  concurrency_key: subject.id,
  created_at: iso(minutesAgo),
  executed_by: 'elastic',
  ...(status !== 'pending' && { started_at: iso(minutesAgo - 0.1) }),
  ...(completedMinutesAgo !== undefined && { completed_at: iso(completedMinutesAgo) }),
  ...(error && { error }),
});

const INVESTIGATIONS: InvestigationAttributes[] = [
  completed({
    severity: 'critical',
    title: 'api-gateway v2.8.1 auth middleware blocks the event loop',
    subject: {
      type: 'significant_event',
      id: 'evt-001',
      summary: 'Web frontend — login and browse latency',
    },
    minutesAgo: 40,
    durationMinutes: 6,
    summary:
      'P95 latency on web-frontend rose from about 120ms to 890ms within ten minutes of the api-gateway v2.8.1 rollout. Every slow request passes through the new auth middleware, which does a synchronous session lookup against Postgres.',
    conclusion:
      'The api-gateway v2.8.1 auth middleware runs a blocking database query on every request. Under normal browse load the Node.js event loop saturates, and latency spreads to every route that api-gateway fronts, including web-frontend login and browse.',
    hypotheses: [
      hypothesis(
        'Synchronous session lookup in the v2.8.1 auth middleware',
        0.93,
        'confirmed',
        'Latency starts with the rollout, and only routes behind the auth middleware slow down.',
        evidence(
          'P95 latency on web-frontend crosses **800ms** within ten minutes of the deploy.',
          timeChart({
            title: 'web-frontend P95 latency',
            yLabel: 'P95 latency',
            unit: 'ms',
            series: [
              timeSeries(
                'P95 latency',
                40,
                [118, 121, 119, 124, 122, 410, 760, 870, 890, 885, 892, 888]
              ),
            ],
            annotations: [annotation(70, 'api-gateway v2.8.1 rollout')],
          })
        ),
        evidence(
          'api-gateway logs show event loop lag warnings from `authMiddleware` from the rollout onwards.',
          timeChart({
            title: 'Event loop lag warnings on api-gateway',
            type: 'bar',
            yLabel: 'Warnings per 5 minutes',
            unit: 'number',
            series: [
              timeSeries('Warnings', 40, [0, 0, 0, 0, 0, 140, 310, 355, 362, 348, 371, 360]),
            ],
          })
        )
      ),
      hypothesis(
        'CDN cache miss storm after asset purge',
        0.03,
        'dismissed',
        'Static asset latency stayed flat. Only API routes slowed down.'
      ),
      hypothesis(
        'Postgres connection pool exhaustion',
        0.04,
        'dismissed',
        'Pool utilisation peaked at 60%. Blocked queries wait on the event loop, not on connections.'
      ),
    ],
    recommendations: [
      recommendation(
        'Roll back api-gateway to v2.8.0',
        0.9,
        'Restores the asynchronous session cache and removes the blocking lookup from the request path.',
        'kubectl rollout undo deployment/api-gateway -n edge'
      ),
      recommendation(
        'Move the session lookup behind the existing Redis cache',
        0.75,
        'Keeps the new auth checks without a database round trip on each request.'
      ),
    ],
    impact: {
      summary:
        'Signed-in users saw login and page loads slow from about 0.1s to 0.9s for the 35 minutes since the rollout. About 18% of login attempts timed out, across all regions.',
      evidence: chartEvidence(
        timeChart({
          title: 'Login attempts by outcome',
          type: 'bar',
          yLabel: 'Attempts per 5 minutes',
          unit: 'number',
          stacked: true,
          series: [
            timeSeries(
              'Succeeded',
              40,
              [4210, 4180, 4250, 4190, 4230, 3620, 3450, 3480, 3440, 3470, 3460, 3450]
            ),
            timeSeries('Timed out', 40, [8, 11, 9, 7, 10, 610, 760, 770, 780, 765, 772, 768]),
          ],
          annotations: [annotation(70, 'api-gateway v2.8.1 rollout')],
        })
      ),
    },
  }),
  completed({
    severity: 'critical',
    title: 'Transaction batching leaks references and OOM-kills payment-service',
    subject: {
      type: 'significant_event',
      id: 'evt-002',
      summary: 'Payment service — memory growth and OOM restarts',
    },
    minutesAgo: 95,
    durationMinutes: 9,
    summary:
      'payment-service pods restart about every 45 minutes after OOM kills. Heap grows linearly from about 512MB to 2GB between restarts. Growth started when the transaction batching flag was enabled.',
    conclusion:
      'The transaction batching feature keeps committed transactions in an unbounded array. Heap grows with payment volume until the kernel OOM-kills the pod, which interrupts in-flight payments on each restart.',
    hypotheses: [
      hypothesis(
        'Unbounded batch buffer retains committed transactions',
        0.9,
        'confirmed',
        'Heap growth rate matches payment throughput, and a heap dump shows millions of retained Transaction objects.',
        evidence(
          'Heap used climbs linearly between restarts and drops back to about 512MB after each OOM kill.',
          timeChart({
            title: 'payment-service heap used',
            yLabel: 'Heap used',
            unit: 'bytes',
            series: [
              timeSeries(
                'Heap used',
                95,
                [0.55, 0.9, 1.3, 1.7, 2.0, 0.52, 0.88, 1.25, 1.65, 1.98, 0.54, 0.9].map((gib) =>
                  Math.round(gib * GIB)
                ),
                15
              ),
            ],
            annotations: [annotation(185, 'OOM kill'), annotation(110, 'OOM kill')],
          })
        ),
        evidence(
          'The heap dump from the last OOM kill is dominated by retained transactions:\n\n| Class | Instances | Retained |\n| --- | --- | --- |\n| `Transaction` | 2.1M | 1.4GB |\n| `BatchEntry` | 2.1M | 310MB |\n| `byte[]` | 0.9M | 120MB |'
        )
      ),
      hypothesis(
        'Container memory limit lowered in the last Helm release',
        0.05,
        'dismissed',
        'The limit has been 2Gi for three months.'
      ),
    ],
    recommendations: [
      recommendation(
        'Disable the transaction batching flag',
        0.92,
        'Stops the leak at once. Pods recover after one restart.'
      ),
      recommendation(
        'Clear the batch buffer after each commit',
        0.8,
        'Fixes the root cause so the flag can be enabled again.'
      ),
    ],
    impact: {
      summary:
        'Each payment-service OOM restart drops the payments in flight on that pod. Over the last three hours about 1.2% of payment attempts failed, in short bursts roughly every 45 minutes.',
      evidence: chartEvidence(
        timeChart({
          title: 'Failed payment attempts',
          type: 'bar',
          yLabel: 'Failures per 15 minutes',
          unit: 'number',
          series: [timeSeries('Failed payments', 95, [3, 4, 2, 5, 6, 212, 3, 4, 5, 6, 198, 4], 15)],
        })
      ),
    },
  }),
  completed({
    severity: 'critical',
    title: 'ILM policy gap fills Elasticsearch data nodes past the high watermark',
    subject: {
      type: 'significant_event',
      id: 'evt-003',
      summary: 'Elasticsearch cluster — disk watermark write throttling',
    },
    minutesAgo: 150,
    durationMinutes: 7,
    summary:
      'Three of five data nodes crossed the 90% disk high watermark. Elasticsearch stopped allocating shards to them and bulk writes started to fail with es_rejected_execution_exception.',
    conclusion:
      'A lifecycle migration left 40 daily log indices without an ILM policy, so they never rolled to the warm tier or got deleted. They hold 38% of hot-tier disk.',
    hypotheses: [
      hypothesis(
        'Indices without an ILM policy after the lifecycle migration',
        0.95,
        'confirmed',
        'All oversized indices were created before the migration and have no lifecycle policy.',
        evidence(
          'Three data nodes are above the 90% high watermark.',
          categoryChart({
            title: 'Disk used per data node',
            xLabel: 'Node',
            yLabel: 'Disk used',
            unit: 'percent',
            seriesName: 'Disk used',
            values: {
              'es-data-0': 93,
              'es-data-1': 91,
              'es-data-2': 92,
              'es-data-3': 71,
              'es-data-4': 68,
            },
          })
        ),
        evidence(
          'The largest hot-tier indices have no lifecycle policy:\n\n| Index | Size | ILM policy |\n| --- | --- | --- |\n| `logs-2026.08.01` | 412GB | none |\n| `logs-2026.08.02` | 405GB | none |\n| `logs-2026.08.03` | 398GB | none |'
        )
      ),
      hypothesis(
        'Ingest volume spike',
        0.03,
        'dismissed',
        'Ingest rate is within 5% of the weekly baseline.'
      ),
    ],
    recommendations: [
      recommendation(
        'Attach the logs-default policy to the orphaned indices',
        0.9,
        'Moves them to the warm tier and frees hot-tier disk in about an hour.',
        'PUT logs-2026.08.*/_settings\n{ "index.lifecycle.name": "logs-default" }'
      ),
    ],
    impact: {
      summary:
        'About 7% of log ingest has been rejected for the last 40 minutes, so logs from all 12 services writing to this cluster are incomplete. Search on existing data is unaffected.',
      evidence: chartEvidence(
        timeChart({
          title: 'Rejected bulk requests',
          yLabel: 'Rejected share',
          unit: 'percent',
          series: [
            timeSeries('Rejected', 150, [0, 0, 0.1, 0, 2.4, 6.8, 7.1, 7.3, 6.9, 7.2, 7.0, 7.1]),
          ],
          annotations: [annotation(185, 'es-data-2 crosses 90%')],
        })
      ),
    },
  }),
  completed({
    severity: 'high',
    title: 'Stale JWKS cache rejects valid tokens after IdP key rotation',
    subject: { type: 'significant_event', id: 'evt-009', summary: 'Auth API — elevated 401 rate' },
    minutesAgo: 70,
    durationMinutes: 5,
    summary:
      '401 responses on api-gateway auth routes doubled during the identity provider key rotation. web-frontend login failures rose at the same time.',
    conclusion:
      'api-gateway caches the IdP JWKS for 24 hours and does not refresh it on an unknown key ID. Tokens signed with the new key fail until each pod restarts.',
    hypotheses: [
      hypothesis(
        'JWKS cache does not refresh on unknown kid',
        0.88,
        'confirmed',
        'All rejected tokens carry the new key ID, and pods restarted after the rotation accept them.',
        evidence(
          '401 share on api-gateway doubles during the rotation window. Every rejected token carries the new `kid`.',
          timeChart({
            title: '401 share on api-gateway',
            yLabel: '401 share',
            unit: 'percent',
            series: [
              timeSeries('401 share', 70, [4.1, 3.9, 4.2, 4.0, 8.6, 9.1, 8.8, 9.0, 8.7, 8.9]),
            ],
            annotations: [annotation(95, 'IdP key rotation')],
          })
        )
      ),
      hypothesis(
        'Clock skew between pods and the IdP',
        0.04,
        'dismissed',
        'NTP offset is under 50ms on all nodes.'
      ),
    ],
    recommendations: [
      recommendation(
        'Restart api-gateway pods',
        0.85,
        'Forces a JWKS refresh and clears the 401 spike.'
      ),
      recommendation(
        'Refresh JWKS on unknown kid',
        0.8,
        'Prevents the same failure on the next rotation.'
      ),
    ],
    impact: {
      summary:
        'About one in five logins has failed since the key rotation 30 minutes ago. Users who were already signed in are unaffected until their token is refreshed.',
      evidence: chartEvidence(
        timeChart({
          title: 'Failed logins on web-frontend',
          yLabel: 'Failed share',
          unit: 'percent',
          series: [
            timeSeries(
              'Failed logins',
              70,
              [1.2, 1.1, 1.3, 1.2, 19.4, 21.0, 20.2, 20.8, 19.9, 20.5]
            ),
          ],
          annotations: [annotation(95, 'IdP key rotation')],
        })
      ),
    },
  }),
  completed({
    severity: 'high',
    title: 'order-processors stuck in deserialisation retries after schema registry blip',
    subject: {
      type: 'significant_event',
      id: 'evt-006',
      summary: 'Order processing — Kafka consumer lag growth',
    },
    minutesAgo: 30,
    durationMinutes: 8,
    summary:
      'Consumer lag for order-processors grew to about 2.4M messages on partitions 0-7. Throughput fell from about 15k/s to 3k/s after a two-minute schema registry outage.',
    conclusion:
      'Consumers cached the registry failure and retry each message with exponential backoff. Throughput never recovers without a consumer restart.',
    hypotheses: [
      hypothesis(
        'Consumers cache the schema registry failure',
        0.86,
        'confirmed',
        'Retry warnings start with the outage and continue after the registry recovered.',
        evidence(
          'Lag grows on all partitions after the outage and keeps growing after the registry recovered.',
          timeChart({
            title: 'order-processors consumer lag',
            yLabel: 'Messages behind',
            unit: 'number',
            series: [
              timeSeries(
                'Lag',
                30,
                [1200, 1500, 1100, 180000, 520000, 910000, 1300000, 1700000, 2050000, 2400000]
              ),
            ],
            annotations: [annotation(62, 'Schema registry outage', 60)],
          })
        )
      ),
      hypothesis(
        'Broker partition leader imbalance',
        0.05,
        'dismissed',
        'Leaders are balanced across brokers.'
      ),
      hypothesis(
        'Downstream order DB slowness',
        0.1,
        'investigating',
        'DB latency rose slightly but may be a side effect.'
      ),
    ],
    recommendations: [
      recommendation(
        'Restart the order-processors consumer group',
        0.8,
        'Clears the cached failure and restores throughput.'
      ),
    ],
    impact: {
      summary:
        'order-processing confirms orders about 25 minutes late and the delay is still growing. No orders have been lost: they are all waiting in Kafka.',
      evidence: chartEvidence(
        timeChart({
          title: 'Orders processed per second',
          yLabel: 'Orders per second',
          unit: 'number',
          series: [
            timeSeries(
              'Throughput',
              30,
              [15100, 14900, 15200, 3100, 2900, 3000, 3200, 2950, 3050, 3000]
            ),
          ],
          annotations: [annotation(62, 'Schema registry outage', 60)],
        })
      ),
    },
  }),
  completed({
    severity: 'high',
    title: 'Checkout error rate alert traced to payment-service restarts',
    subject: {
      type: 'alert',
      id: 'alert-checkout-error-rate',
      summary: 'Checkout error rate above 5% for 10 minutes',
    },
    minutesAgo: 100,
    durationMinutes: 4,
    summary:
      'The checkout error rate alert fired three times in two hours. Every spike lines up with a payment-service pod restart.',
    conclusion:
      'The alert is a downstream symptom of the payment-service memory leak. Checkout itself is healthy between restarts.',
    hypotheses: [
      hypothesis(
        'payment-service restarts cause checkout failures',
        0.84,
        'confirmed',
        'Error spikes and pod restarts share the same timestamps.',
        evidence(
          'payment-service pods were `OOMKilled` at each checkout error spike.',
          timeChart({
            title: 'payment-service pod restarts',
            type: 'bar',
            yLabel: 'Restarts per 10 minutes',
            unit: 'number',
            series: [timeSeries('Restarts', 100, [0, 3, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0], 10)],
          })
        )
      ),
    ],
    recommendations: [
      recommendation(
        'Group this alert with the payment-service investigation',
        0.7,
        'Avoids duplicate pages for one root cause.'
      ),
    ],
    impact: {
      summary:
        'Checkout fails for about 8% of shoppers for roughly ten minutes after each payment-service restart, three times in the last two hours. Checkout is healthy in between.',
      entities: [
        entity(
          'web-frontend',
          'service',
          'web-frontend-logs',
          'web-frontend',
          evidence(
            'Shoppers get a payment error on the last step; their carts are kept, so most retry.',
            timeChart({
              title: 'Checkout error rate',
              yLabel: 'Error rate',
              unit: 'percent',
              series: [
                timeSeries(
                  'Error rate',
                  100,
                  [0.4, 8.1, 3.2, 0.5, 0.4, 7.9, 2.9, 0.4, 8.3, 3.0, 0.5, 0.4],
                  10
                ),
              ],
            })
          )
        ),
        entity(
          'payment-service',
          'service',
          'payment-service-logs',
          'payment-service',
          evidence(
            'Payment calls from checkout fail while each pod restarts:\n\n| Restart | Failed calls | Duration |\n| --- | --- | --- |\n| 1 | 212 | 9 min |\n| 2 | 198 | 11 min |\n| 3 | 205 | 10 min |'
          )
        ),
      ],
    },
  }),
  completed({
    severity: 'medium',
    title: 'Catalog index lag returns empty search facets for new SKUs',
    subject: {
      type: 'significant_event',
      id: 'evt-008',
      summary: 'Search API — elevated empty-result rate',
    },
    minutesAgo: 55,
    durationMinutes: 6,
    summary:
      'The empty-result share on search-api rose after the catalog-service deploy. Only SKUs published after the deploy are affected.',
    conclusion:
      'The new catalog-service build indexes with a 15-minute refresh interval. New SKUs are invisible to search until the next refresh.',
    hypotheses: [
      hypothesis(
        'Refresh interval changed in the catalog-service deploy',
        0.8,
        'confirmed',
        'Only products created after the deploy are missing.',
        evidence(
          'The catalog index settings changed with the deploy:\n\n| Setting | Before | After |\n| --- | --- | --- |\n| `index.refresh_interval` | `1s` | `15m` |'
        )
      ),
    ],
    recommendations: [
      recommendation(
        'Restore the 1s refresh interval',
        0.85,
        'New SKUs become searchable again within seconds.'
      ),
    ],
    impact: {
      summary:
        'About 340 products published since the deploy do not show up in search for up to 15 minutes. Roughly 4% of searches return no results, up from 1%.',
      evidence: chartEvidence(
        timeChart({
          title: 'Searches with no results',
          yLabel: 'Empty-result share',
          unit: 'percent',
          series: [
            timeSeries(
              'Empty results',
              55,
              [1.0, 1.1, 0.9, 1.0, 3.2, 4.4, 5.1, 2.8, 4.1, 4.9, 2.9, 4.2]
            ),
          ],
          annotations: [annotation(90, 'catalog-service deploy')],
        })
      ),
    },
  }),
  completed({
    severity: 'medium',
    title: 'Nightly batch saturates the cache-service connection pool',
    subject: {
      type: 'manual',
      id: 'manual-cache-latency',
      summary: 'Why does cache latency rise every night at 02:00?',
    },
    minutesAgo: 600,
    durationMinutes: 10,
    triggerType: 'manual',
    summary:
      'cache-service P99 latency rises from 2ms to 40ms every night between 02:00 and 02:20 UTC.',
    conclusion:
      'The nightly price-sync batch opens 400 connections to cache-service and exhausts its pool. Online traffic queues behind it for about 20 minutes.',
    hypotheses: [
      hypothesis(
        'price-sync batch exhausts the connection pool',
        0.78,
        'confirmed',
        'Connection count peaks with the batch schedule.',
        evidence(
          'Open connections hit the pool limit of **400** while the batch runs, and P99 latency follows.',
          timeChart({
            title: 'cache-service open connections',
            yLabel: 'Connections',
            unit: 'number',
            series: [
              timeSeries('Open connections', 600, [42, 45, 44, 400, 400, 400, 400, 60, 41, 44]),
            ],
            annotations: [annotation(630, 'price-sync batch', 610)],
          })
        )
      ),
      hypothesis('Redis RDB snapshot at 02:00', 0.1, 'dismissed', 'Snapshots run at 04:00.'),
    ],
    recommendations: [
      recommendation(
        'Limit price-sync to 50 connections',
        0.75,
        'Keeps headroom for online traffic.'
      ),
    ],
    impact: {
      summary:
        'For about 20 minutes each night, cart and pricing reads from cache-service slow from 2ms to 40ms P99. It is a low-traffic hour, so few shoppers notice, and there are no errors.',
      evidence: evidence(
        'P99 latency on cache-service during the batch window:\n\n| Window | P99 latency |\n| --- | --- |\n| 01:40–02:00 | 2ms |\n| 02:00–02:20 | 40ms |\n| 02:20–02:40 | 3ms |'
      ),
    },
  }),
  completed({
    severity: 'low',
    title: 'Cache hit-rate dip was a planned node replacement',
    subject: {
      type: 'significant_event',
      id: 'evt-007',
      summary: 'Cache layer — brief hit-rate dip (dismissed)',
    },
    minutesAgo: 110,
    durationMinutes: 3,
    summary:
      'Redis cache hit rate dipped for about eight minutes. Throughput and error rates stayed flat.',
    conclusion:
      'The dip matches a planned node drain. The hit rate recovered once the replacement node warmed up. No action is needed.',
    hypotheses: [
      hypothesis(
        'Planned node drain',
        0.9,
        'confirmed',
        'The maintenance calendar lists the drain at this time.'
      ),
    ],
    recommendations: [],
    impact: {
      summary: 'No user-facing impact. Throughput, latency, and error rates stayed flat.',
    },
  }),
  completed({
    severity: 'low',
    title: 'cert-manager lost DNS01 permissions after RBAC tightening',
    subject: {
      type: 'significant_event',
      id: 'evt-005',
      summary: 'Ingress controller — TLS certificate near expiry',
    },
    minutesAgo: 1300,
    durationMinutes: 5,
    summary:
      'The internal wildcard certificate was 48 hours from expiry. Manual renewal has already restored coverage.',
    conclusion:
      'An RBAC change removed cert-manager access to the DNS01 solver secret, so automated renewal failed without an alert.',
    hypotheses: [
      hypothesis(
        'RBAC change removed solver secret access',
        0.85,
        'confirmed',
        'cert-manager logs show forbidden errors since the RBAC change.',
        evidence(
          'cert-manager has failed every renewal attempt since the RBAC change with:\n\n```\nsecrets "dns01-solver" is forbidden: User "system:serviceaccount:cert-manager:cert-manager" cannot get resource "secrets"\n```'
        )
      ),
    ],
    recommendations: [
      recommendation(
        'Restore the cert-manager Role binding',
        0.8,
        'Prevents the next renewal from failing.'
      ),
      recommendation('Alert on renewal failures', 0.7, 'Catches silent failures before expiry.'),
    ],
    impact: {
      summary:
        'No user-facing impact yet. Without the manual renewal, every internal HTTPS endpoint behind the ingress controller would have failed TLS in 48 hours.',
      evidence: evidence(
        'The `*.internal` wildcard certificate served by the ingress was 48 hours from expiry before the manual renewal. The last automated renewal succeeded 58 days ago.'
      ),
    },
  }),
  unfinished({
    status: 'running',
    title: 'DNS resolution failures in us-east-1 AZ-b',
    subject: {
      type: 'significant_event',
      id: 'evt-004',
      summary: 'DNS resolver — intermittent resolution failures',
    },
    minutesAgo: 3,
  }),
  unfinished({
    status: 'pending',
    title: 'Investigate p99 latency on order-processing',
    subject: {
      type: 'manual',
      id: 'manual-order-latency',
      summary: "Is order-processing slower since yesterday's deploy?",
    },
    minutesAgo: 1,
    triggerType: 'manual',
  }),
  unfinished({
    status: 'failed',
    title: 'Kafka broker disk usage alert',
    subject: {
      type: 'alert',
      id: 'alert-kafka-disk',
      summary: 'Kafka broker disk usage above 80%',
    },
    minutesAgo: 200,
    completedMinutesAgo: 190,
    error: 'The investigation agent timed out after 10 minutes.',
  }),
  unfinished({
    status: 'cancelled',
    title: 'Web frontend 5xx spike',
    subject: {
      type: 'manual',
      id: 'manual-web-5xx',
      summary: 'Why did web-frontend return 5xx at 09:10?',
    },
    minutesAgo: 400,
    triggerType: 'manual',
    completedMinutesAgo: 398,
  }),
];

const basicAuth = (credentials: string): string =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

const resolveKibanaUrl = async (url: string, auth: string): Promise<string> => {
  const base = url.replace(/\/$/, '');
  if (new URL(base).pathname !== '/') {
    return base;
  }
  const response = await fetch(`${base}/`, {
    redirect: 'manual',
    headers: { Authorization: basicAuth(auth) },
  });
  const location = response.headers.get('location');
  return location && /^\/[^/?]+\/?$/.test(location)
    ? `${base}${location.replace(/\/$/, '')}`
    : base;
};

// Investigations persist severity with a sortable numeric prefix; the API converts it back to the
// canonical value on read. Seeds are written straight into .kibana, so they must use the stored form.
const STORED_SEVERITY: Record<Severity, string> = {
  critical: '80-critical',
  high: '60-high',
  medium: '40-medium',
  low: '20-low',
};

const toStoredAttributes = (attributes: InvestigationAttributes) =>
  attributes.severity === undefined
    ? attributes
    : { ...attributes, severity: STORED_SEVERITY[attributes.severity] };

const toBulkBody = (): string =>
  INVESTIGATIONS.flatMap((attributes, index) => [
    { index: { _id: `${SO_TYPE}:${ID_PREFIX}${String(index + 1).padStart(2, '0')}` } },
    {
      type: SO_TYPE,
      references: [],
      managed: false,
      coreMigrationVersion: '8.8.0',
      typeMigrationVersion: TYPE_MIGRATION_VERSION,
      created_at: attributes.created_at,
      updated_at: attributes.completed_at ?? attributes.created_at,
      [SO_TYPE]: toStoredAttributes(attributes),
    },
  ])
    .map((line) => JSON.stringify(line))
    .join('\n')
    .concat('\n');

run(
  async ({ log, flags }) => {
    const esUrl = String(flags['es-url']);
    const auth = String(flags.auth);
    const kibanaUrl = await resolveKibanaUrl(String(flags['kibana-url']), auth);

    const bulkResponse = await fetch(`${esUrl}/.kibana/_bulk?refresh=true`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(String(flags['kibana-system-auth'])),
        'Content-Type': 'application/x-ndjson',
      },
      body: toBulkBody(),
    });
    const bulkResult = await bulkResponse.json();
    if (!bulkResponse.ok || bulkResult.errors) {
      throw new Error(`Investigation bulk failed: ${JSON.stringify(bulkResult).slice(0, 500)}`);
    }
    log.success(`Indexed ${INVESTIGATIONS.length} investigations into ${esUrl}/.kibana`);

    const listResponse = await fetch(`${kibanaUrl}/internal/nightshift/investigations?size=1`, {
      headers: { Authorization: basicAuth(auth), 'x-elastic-internal-origin': 'Kibana' },
    });
    const { total } = await listResponse.json();
    log.info(`Investigations visible in Kibana: ${total}`);
    log.info(`Open ${kibanaUrl}/app/nightshift`);
  },
  {
    description: `Seeds ${INVESTIGATIONS.length} Nightshift investigations covering every severity and status.

      Investigations are hidden saved objects, so they are written straight into .kibana as the
      kibana_system user. No AI connector or workflow run is needed. Re-running overwrites them.`,
    flags: {
      string: ['es-url', 'kibana-url', 'auth', 'kibana-system-auth'],
      default: {
        'es-url': 'http://localhost:9200',
        'kibana-url': 'http://localhost:5601',
        auth: 'elastic:changeme',
        'kibana-system-auth': 'kibana_system:changeme',
      },
      help: `
        --es-url              Elasticsearch URL (default: http://localhost:9200)
        --kibana-url          Kibana URL; the dev base path is auto-detected (default: http://localhost:5601)
        --auth                Kibana user credentials (default: elastic:changeme)
        --kibana-system-auth  Credentials allowed to write .kibana (default: kibana_system:changeme)
      `,
    },
  }
);
