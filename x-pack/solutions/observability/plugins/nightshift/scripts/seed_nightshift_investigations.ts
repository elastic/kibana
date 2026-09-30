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
  InvestigationHypothesis,
  InvestigationImpact,
  InvestigationRecommendation,
} from '@kbn/significant-events-schema';

const SO_TYPE = 'nightshift-investigation';
const TYPE_MIGRATION_VERSION = '10.3.0';
const ID_PREFIX = 'nightshift-seed-inv-';

type Evidence = NonNullable<InvestigationHypothesis['evidence']>[number];
type ImpactEntity = InvestigationImpact['entities'][number];

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

const evidence = (description: string, esqlQuery: string, minutesAgo: number): Evidence => ({
  description,
  esql_query: esqlQuery,
  time_range: { from: iso(minutesAgo + 60), to: iso(minutesAgo) },
});

const hypothesis = (
  candidate: string,
  confidence: number,
  status: InvestigationHypothesis['status'],
  reason: string,
  ...evidences: Evidence[]
): InvestigationHypothesis => ({ candidate, confidence, status, reason, evidence: evidences });

const recommendation = (
  title: string,
  confidence: number,
  description: string,
  code?: string
): InvestigationRecommendation => ({ title, confidence, description, ...(code && { code }) });

const blindSpot = (title: string, confidence: number, description: string) => ({
  title,
  confidence,
  description,
});

const entity = (
  name: string,
  type: string,
  streamName: string,
  featureId?: string
): ImpactEntity => ({
  name,
  type,
  stream_name: streamName,
  ...(featureId && { feature_id: featureId }),
});

const completed = ({
  severity,
  title,
  subject,
  minutesAgo,
  durationMinutes,
  triggerType = 'automatic',
  entities,
  ...output
}: Required<Pick<InvestigationStructuredOutput, 'summary' | 'conclusion'>> &
  Pick<InvestigationStructuredOutput, 'hypotheses' | 'recommendations' | 'blind_spots'> & {
    severity: Severity;
    title: string;
    subject: Subject;
    minutesAgo: number;
    durationMinutes: number;
    triggerType?: InvestigationTriggerType;
    entities: ImpactEntity[];
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
  impact: { entities },
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
    severity: '80-critical',
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
          'P95 latency on web-frontend crosses 800ms within ten minutes of the deploy.',
          'FROM logs.web-frontend\n| WHERE service.name == "web-frontend"\n| STATS p95 = PERCENTILE(transaction.duration.us, 95) BY minute = BUCKET(@timestamp, 5 minutes)\n| SORT minute DESC',
          40
        ),
        evidence(
          'api-gateway logs show event loop lag warnings from the auth middleware.',
          'FROM logs.api-gateway\n| WHERE message LIKE "*event loop lag*"\n| STATS count = COUNT(*) BY minute = BUCKET(@timestamp, 5 minutes)',
          40
        )
      ),
      hypothesis(
        'CDN cache miss storm after asset purge',
        0.12,
        'dismissed',
        'Static asset latency stayed flat. Only API routes slowed down.'
      ),
      hypothesis(
        'Postgres connection pool exhaustion',
        0.35,
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
    blind_spots: [
      blindSpot(
        'No database spans in traces',
        0.6,
        'api-gateway does not export Postgres spans, so query duration is inferred from logs.'
      ),
    ],
    entities: [
      entity('web-frontend', 'service', 'logs.web-frontend', 'web-frontend'),
      entity('api-gateway', 'service', 'logs.api-gateway', 'api-gateway'),
    ],
  }),
  completed({
    severity: '80-critical',
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
          'Heap used climbs linearly between restarts.',
          'FROM logs.payment-service\n| STATS max_heap = MAX(jvm.memory.heap.used) BY minute = BUCKET(@timestamp, 5 minutes)\n| SORT minute DESC',
          95
        )
      ),
      hypothesis(
        'Container memory limit lowered in the last Helm release',
        0.2,
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
    blind_spots: [],
    entities: [entity('payment-service', 'service', 'logs.payment-service', 'payment-service')],
  }),
  completed({
    severity: '80-critical',
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
          'Disk used is above 85% on three data nodes.',
          'FROM logs.elasticsearch\n| EVAL disk_used_pct = 100 - (elasticsearch.node.stats.fs.total.available_in_bytes / elasticsearch.node.stats.fs.total.total_in_bytes * 100)\n| WHERE disk_used_pct > 85\n| KEEP @timestamp, elasticsearch.node.name, disk_used_pct',
          150
        )
      ),
      hypothesis(
        'Ingest volume spike',
        0.25,
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
    blind_spots: [
      blindSpot(
        'Snapshot repository health not checked',
        0.4,
        'Deleting indices is only safe if the latest snapshot succeeded.'
      ),
    ],
    entities: [
      entity(
        'Elasticsearch data nodes',
        'infrastructure',
        'logs.elasticsearch',
        'elasticsearch-data'
      ),
    ],
  }),
  completed({
    severity: '60-high',
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
          '401 share on api-gateway doubles during the rotation window.',
          'FROM logs.api-gateway\n| EVAL unauthorized = CASE(http.response.status_code == 401, 1, 0)\n| STATS rate = AVG(unauthorized) * 100 BY minute = BUCKET(@timestamp, 5 minutes)',
          70
        )
      ),
      hypothesis(
        'Clock skew between pods and the IdP',
        0.15,
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
    blind_spots: [],
    entities: [
      entity('api-gateway', 'service', 'logs.api-gateway', 'api-gateway'),
      entity('web-frontend', 'service', 'logs.web-frontend', 'web-frontend'),
    ],
  }),
  completed({
    severity: '60-high',
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
          'Lag grows on all partitions after the outage.',
          'FROM logs.kafka-cluster\n| WHERE kafka.consumergroup.id == "order-processors"\n| STATS max_lag = MAX(kafka.consumergroup.lag) BY minute = BUCKET(@timestamp, 5 minutes)',
          30
        )
      ),
      hypothesis(
        'Broker partition leader imbalance',
        0.3,
        'dismissed',
        'Leaders are balanced across brokers.'
      ),
      hypothesis(
        'Downstream order DB slowness',
        0.2,
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
    blind_spots: [
      blindSpot(
        'No consumer-side metrics',
        0.5,
        'Only broker-side lag is available for this group.'
      ),
    ],
    entities: [
      entity('order-processors', 'consumer_group', 'logs.kafka-cluster', 'order-processors'),
      entity('order-processing', 'service', 'logs.order-processing'),
    ],
  }),
  completed({
    severity: '60-high',
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
          'payment-service logs show restarts at each spike.',
          'FROM logs.payment-service\n| WHERE message LIKE "*OOMKilled*"\n| KEEP @timestamp, message',
          100
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
    blind_spots: [],
    entities: [
      entity('payment-service', 'service', 'logs.payment-service', 'payment-service'),
      entity('web-frontend', 'service', 'logs.web-frontend', 'web-frontend'),
    ],
  }),
  completed({
    severity: '40-medium',
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
          'Empty search messages start at the deploy time.',
          'FROM logs.web-frontend\n| WHERE message LIKE "*empty search*"\n| STATS count = COUNT(*) BY minute = BUCKET(@timestamp, 5 minutes)',
          55
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
    blind_spots: [
      blindSpot(
        'Revenue impact unknown',
        0.5,
        'No conversion data is available for the affected SKUs.'
      ),
    ],
    entities: [entity('web-frontend', 'service', 'logs.web-frontend', 'web-frontend')],
  }),
  completed({
    severity: '40-medium',
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
          'Latency and connections rise at 02:00 each night.',
          'FROM logs.cache-service\n| STATS p99 = PERCENTILE(event.duration, 99) BY hour = BUCKET(@timestamp, 1 hour)',
          600
        )
      ),
      hypothesis('Redis RDB snapshot at 02:00', 0.3, 'dismissed', 'Snapshots run at 04:00.'),
    ],
    recommendations: [
      recommendation(
        'Limit price-sync to 50 connections',
        0.75,
        'Keeps headroom for online traffic.'
      ),
    ],
    blind_spots: [],
    entities: [entity('cache-service', 'service', 'logs.cache-service', 'cache-service')],
  }),
  completed({
    severity: '20-low',
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
    blind_spots: [],
    entities: [entity('cache-service', 'service', 'logs.cache-service', 'cache-service')],
  }),
  completed({
    severity: '20-low',
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
          'Certificate expiry warnings on ingress.',
          'FROM logs.ingress-controller\n| WHERE message LIKE "*certificate*expir*"\n| KEEP @timestamp, message',
          1300
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
    blind_spots: [],
    entities: [
      entity('Ingress controller', 'service', 'logs.ingress-controller', 'ingress-controller'),
    ],
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
      [SO_TYPE]: attributes,
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
