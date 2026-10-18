/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DEFAULT_ALERTS_SNAPSHOT_CONFIG,
  type AlertsSnapshotConfig,
} from '@kbn/security-evals-alerts-snapshot';
import {
  ALERTS_RAG_EXPECTED_FACTS,
  allRuleAlertCounts,
  type AlertCountByName,
  type SeverityFacts,
} from './alerts_rag_expected_facts';

/**
 * The GCS snapshot the alerts-rag dataset was authored against.
 *
 * Pinning this in code (rather than only in `kbn-security-evals-alerts-snapshot`)
 * gives a single location where dataset ↔ snapshot drift surfaces in a diff:
 * if someone rotates the shared snapshot to a different episode set without
 * also updating the dataset's reference answers, the change shows up here.
 */
export const ALERTS_RAG_DATASET_SNAPSHOT: Readonly<AlertsSnapshotConfig> =
  DEFAULT_ALERTS_SNAPSHOT_CONFIG;

const ALERT_INDEX_PATTERN = '.internal.alerts-security.alerts-default-*';

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface StatsAgg {
  min: number | null;
  max: number | null;
}

interface SeverityBucket extends TermsBucket {
  rules?: { buckets: TermsBucket[] };
  hosts?: { buckets: TermsBucket[] };
  risk_score?: StatsAgg;
}

/**
 * Every agg is optional: `ignore_unavailable`/`allow_no_indices` mean a
 * non-restored cluster can answer with no `aggregations` key at all, and that
 * case must surface as a named violation rather than a TypeError.
 */
interface VerifierAggregations {
  severities?: { buckets: TermsBucket[] };
  hosts?: { buckets: TermsBucket[] };
  users?: { buckets: TermsBucket[] };
  rules?: { buckets: TermsBucket[] };
  risk_score?: StatsAgg;
  by_severity?: { buckets: SeverityBucket[] };
  newest_alert?: { hits: { hits: Array<{ _source?: Record<string, unknown> }> } };
  last_hour?: { doc_count: number };
  example_alerts?: { buckets: Record<string, { doc_count: number } | undefined> };
}

const toCountMap = (buckets: TermsBucket[]): Map<string, number> =>
  new Map(buckets.map(({ key, doc_count }) => [key, doc_count]));

const formatCounts = (buckets: TermsBucket[]): string =>
  buckets.map(({ key, doc_count }) => `${key} (${doc_count})`).join(', ') || '(none)';

/**
 * Compare a measured `name → count` map against the pinned facts, reporting
 * missing names, unexpected names and per-name count drift as separate
 * violations so a single CI log scan shows the whole delta.
 */
const collectCountViolations = ({
  field,
  measured,
  expected,
  violations,
}: {
  field: string;
  measured: Map<string, number>;
  expected: readonly AlertCountByName[];
  violations: string[];
}): void => {
  const expectedMap = new Map(expected.map(({ name, count }) => [name, count]));

  for (const { name, count } of expected) {
    const actual = measured.get(name);
    if (actual === undefined) {
      violations.push(
        `${field} "${name}": dataset reference answers state ${count} open alert(s), but the ` +
          `snapshot has no such value`
      );
    } else if (actual !== count) {
      violations.push(
        `${field} "${name}": dataset reference answers state ${count} open alert(s), ` +
          `snapshot has ${actual}`
      );
    }
  }

  for (const name of measured.keys()) {
    if (!expectedMap.has(name)) {
      violations.push(
        `${field} "${name}": present in the snapshot but absent from the dataset's reference ` +
          `answers — add it to ALERTS_RAG_EXPECTED_FACTS and to the reference answers, otherwise ` +
          `the correctness judge scores answers that mention it as NOT_IN_GROUND_TRUTH`
      );
    }
  }
};

const readSourceField = (source: Record<string, unknown> | undefined, path: string[]): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)[key]
        : undefined,
    source
  );

const collectNewestAlertViolations = ({
  newestSource,
  violations,
}: {
  newestSource: Record<string, unknown> | undefined;
  violations: string[];
}): void => {
  if (newestSource === undefined) {
    violations.push(
      'no open alert found, so the "most recent alert" reference answer cannot be verified'
    );
    return;
  }

  const expected = ALERTS_RAG_EXPECTED_FACTS.mostRecentAlert;
  const expectedByField: Array<[string, string, unknown]> = [
    ['@timestamp', expected.timestamp, readSourceField(newestSource, ['@timestamp'])],
    [
      'kibana.alert.rule.name',
      expected.ruleName,
      readSourceField(newestSource, ['kibana', 'alert', 'rule', 'name']),
    ],
    [
      'kibana.alert.severity',
      expected.severity,
      readSourceField(newestSource, ['kibana', 'alert', 'severity']),
    ],
    ['host.name', expected.hostName, readSourceField(newestSource, ['host', 'name'])],
    ['user.name', expected.userName, readSourceField(newestSource, ['user', 'name'])],
  ];

  for (const [field, expectedValue, actualValue] of expectedByField) {
    if (actualValue !== expectedValue) {
      violations.push(
        `newest open alert ${field}: dataset reference answer states "${expectedValue}", ` +
          `snapshot has "${String(actualValue)}"`
      );
    }
  }
};

const formatViolations = (violations: string[]): string =>
  violations.map((v, i) => `  ${i + 1}. ${v}`).join('\n');

/**
 * The individual alerts the reference answers name as examples. They are the
 * only facts in the references that are about a single document rather than a
 * partition, so they need their own existence check: a rotated snapshot that
 * still had 255 critical alerts could otherwise keep every count check green
 * while the reference pointed at alerts that no longer exist.
 */
const buildExampleAlertChecks = (): Array<{
  label: string;
  description: string;
  filter: Record<string, unknown>;
}> => {
  const facts = ALERTS_RAG_EXPECTED_FACTS;
  const examples = [
    { label: 'most recent alert', example: facts.mostRecentAlert },
    ...facts.criticalAlertExamples.map((example, index) => ({
      label: `critical-tier example ${index + 1}`,
      example,
    })),
    { label: 'lowest-severity example', example: facts.lowestSeverityAlertExample },
  ];

  return examples.map(({ label, example }) => ({
    label,
    description:
      `${example.ruleName} on ${example.hostName} by ${example.userName} ` +
      `(@timestamp ${example.timestamp})`,
    filter: {
      bool: {
        filter: [
          { term: { 'kibana.alert.workflow_status': 'open' } },
          { term: { 'kibana.alert.rule.name': example.ruleName } },
          { term: { 'host.name': example.hostName } },
          { term: { 'user.name': example.userName } },
          { term: { 'kibana.alert.severity': example.severity } },
          { range: { '@timestamp': { gte: example.timestamp, lte: example.timestamp } } },
        ],
      },
    },
  }));
};

/**
 * Compare one severity tier's measured breakdown against the facts the
 * reference answers state for that tier.
 */
const collectTierViolations = ({
  tier,
  bucket,
  expectedTier,
  violations,
}: {
  tier: 'critical' | 'high';
  bucket: SeverityBucket;
  expectedTier: SeverityFacts;
  violations: string[];
}): void => {
  if (
    bucket.risk_score?.min !== expectedTier.riskScore ||
    bucket.risk_score?.max !== expectedTier.riskScore
  ) {
    violations.push(
      `${tier} risk_score: dataset reference answers state every ${tier} open alert has ` +
        `risk_score ${expectedTier.riskScore}, snapshot has ${String(bucket.risk_score?.min)}-` +
        `${String(bucket.risk_score?.max)}`
    );
  }

  collectCountViolations({
    field: `${tier} kibana.alert.rule.name`,
    measured: toCountMap(bucket.rules?.buckets ?? []),
    expected: expectedTier.rules,
    violations,
  });

  collectCountViolations({
    field: `${tier} host.name`,
    measured: toCountMap(bucket.hosts?.buckets ?? []),
    expected: expectedTier.hosts,
    violations,
  });
};

/**
 * Verify the restored alerts snapshot still matches the facts baked into
 * `alertsRagDataset`'s reference answers ({@link ALERTS_RAG_EXPECTED_FACTS}).
 * Throws with all violations enumerated so failure is actionable in a single
 * CI log scan.
 *
 * The reference answers are the `[Ground Truth Response]` the correctness judge
 * scores against, so a snapshot that no longer matches them silently caps
 * Factuality for every data-bearing example; failing at boot turns that into a
 * named one-line diagnosis instead.
 *
 * Safe to call against a non-restored cluster (will just report "no open alerts
 * found"); callers in production-like flows should gate on whether
 * `resolveAlertsSnapshotConfig` returned a config and skip verification when
 * no snapshot was restored.
 */
export const verifyAlertsRagSnapshot = async ({
  esClient,
  log,
}: {
  esClient: Client;
  log: ToolingLog;
}): Promise<void> => {
  const exampleAlertChecks = buildExampleAlertChecks();
  const response = (await esClient.search({
    index: ALERT_INDEX_PATTERN,
    size: 0,
    track_total_hits: true,
    ignore_unavailable: true,
    allow_no_indices: true,
    query: { term: { 'kibana.alert.workflow_status': 'open' } },
    aggs: {
      severities: { terms: { field: 'kibana.alert.severity', size: 10 } },
      hosts: { terms: { field: 'host.name', size: 64 } },
      users: { terms: { field: 'user.name', size: 64 } },
      rules: { terms: { field: 'kibana.alert.rule.name', size: 128 } },
      risk_score: { stats: { field: 'kibana.alert.risk_score' } },
      by_severity: {
        terms: { field: 'kibana.alert.severity', size: 10 },
        aggs: {
          rules: { terms: { field: 'kibana.alert.rule.name', size: 128 } },
          hosts: { terms: { field: 'host.name', size: 64 } },
          risk_score: { stats: { field: 'kibana.alert.risk_score' } },
        },
      },
      newest_alert: { top_hits: { size: 1, sort: [{ '@timestamp': 'desc' }] } },
      last_hour: { filter: { range: { '@timestamp': { gte: 'now-1h' } } } },
      example_alerts: {
        filters: {
          filters: Object.fromEntries(
            exampleAlertChecks.map(({ label, filter }) => [label, filter])
          ),
        },
      },
    },
  })) as unknown as {
    hits: { total: { value: number } | number };
    aggregations?: VerifierAggregations;
  };

  const totalOpenAlerts =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggs = response.aggregations;
  const facts = ALERTS_RAG_EXPECTED_FACTS;
  const violations: string[] = [];

  if (totalOpenAlerts !== facts.totalOpenAlerts) {
    violations.push(
      `open alerts: dataset reference answers describe ${facts.totalOpenAlerts} open alerts, ` +
        `snapshot has ${totalOpenAlerts}`
    );
  }

  collectCountViolations({
    field: 'severity',
    measured: toCountMap(aggs?.severities?.buckets ?? []),
    expected: [
      { name: 'critical', count: facts.severities.critical.count },
      { name: 'high', count: facts.severities.high.count },
    ],
    violations,
  });

  collectCountViolations({
    field: 'host.name',
    measured: toCountMap(aggs?.hosts?.buckets ?? []),
    expected: facts.hostAlertCounts,
    violations,
  });

  collectCountViolations({
    field: 'user.name',
    measured: toCountMap(aggs?.users?.buckets ?? []),
    expected: facts.userAlertCounts,
    violations,
  });

  collectCountViolations({
    field: 'kibana.alert.rule.name',
    measured: toCountMap(aggs?.rules?.buckets ?? []),
    expected: allRuleAlertCounts(),
    violations,
  });

  const measuredRiskScore = aggs?.risk_score;
  if (
    measuredRiskScore?.min !== facts.riskScoreRange.min ||
    measuredRiskScore?.max !== facts.riskScoreRange.max
  ) {
    violations.push(
      `risk_score range: dataset reference answers state ${facts.riskScoreRange.min}-` +
        `${facts.riskScoreRange.max}, snapshot has ${String(measuredRiskScore?.min)}-` +
        `${String(measuredRiskScore?.max)}`
    );
  }

  const severityBuckets = new Map(
    (aggs?.by_severity?.buckets ?? []).map((bucket) => [bucket.key, bucket])
  );

  for (const tier of ['critical', 'high'] as const) {
    const expectedTier = facts.severities[tier];
    const bucket = severityBuckets.get(tier);

    if (bucket === undefined) {
      violations.push(
        `${tier} tier: absent from the snapshot, but the dataset's reference answers describe ` +
          `${expectedTier.count} ${tier} open alert(s)`
      );
    } else {
      collectTierViolations({ tier, bucket, expectedTier, violations });
    }
  }

  collectNewestAlertViolations({
    newestSource: aggs?.newest_alert?.hits.hits[0]?._source,
    violations,
  });

  const alertsInLastHour = aggs?.last_hour?.doc_count ?? 0;
  if (alertsInLastHour !== 0) {
    violations.push(
      `last hour: snapshot has ${alertsInLastHour} open alert(s) inside now-1h, but the ` +
        `"Have any new alerts been triggered in the last hour?" reference answer expects an ` +
        `empty window`
    );
  }

  const exampleBuckets = aggs?.example_alerts?.buckets;
  for (const { label, description } of exampleAlertChecks) {
    const matched = exampleBuckets?.[label]?.doc_count ?? 0;
    if (matched === 0) {
      violations.push(
        `example alert "${label}": the reference answers name ${description}, but the snapshot ` +
          `has no matching open alert`
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `[alerts-rag] restored snapshot does not match the facts the dataset's reference answers ` +
        `state (ALERTS_RAG_EXPECTED_FACTS in alerts_rag_expected_facts.ts). The snapshot at ` +
        `gs://${ALERTS_RAG_DATASET_SNAPSHOT.bucket}/${ALERTS_RAG_DATASET_SNAPSHOT.basePath} ` +
        `must either be restored to the pinned contents or the expected facts and the dataset's ` +
        `reference answers re-aligned. Violations:\n${formatViolations(violations)}`
    );
  }

  log.info(
    `[alerts-rag] snapshot matches the dataset's expected facts ` +
      `(open alerts=${totalOpenAlerts}, ` +
      `severities=[${formatCounts(aggs?.severities?.buckets ?? [])}], ` +
      `hosts=${(aggs?.hosts?.buckets ?? []).length}, users=${
        (aggs?.users?.buckets ?? []).length
      }, ` +
      `rules=${(aggs?.rules?.buckets ?? []).length}, ` +
      `newest alert=${facts.mostRecentAlert.timestamp})`
  );
};
