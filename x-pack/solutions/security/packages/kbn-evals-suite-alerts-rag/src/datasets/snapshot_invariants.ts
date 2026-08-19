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

/**
 * Concrete assumptions every dataset example relies on. Sourced directly from
 * `alertsRagDataset`:
 *
 * - "Which alerts should I look at first?" needs a non-trivial open-alert set
 *   with at least one `critical` or `high` severity so the "prioritise critical
 *   then high" reference answer is grounded in the data.
 * - "What hosts are affected?" needs ≥2 distinct `host.name` values so the
 *   answer can enumerate hosts.
 * - "Which user.name is mentioned the most?" needs ≥1 open alert with a
 *   populated `user.name`.
 * - "What is the most recent alert?" needs ≥1 open alert with a populated
 *   `kibana.alert.rule.name` (the reference answer mentions the rule name).
 */
export const ALERTS_RAG_DATASET_INVARIANTS = {
  minOpenAlerts: 5,
  requiredSeverities: ['critical', 'high'] as const,
  minDistinctHosts: 2,
  minOpenAlertsWithUserName: 1,
  minOpenAlertsWithRuleName: 1,
} as const;

const ALERT_INDEX_PATTERN = '.internal.alerts-security.alerts-default-*';

interface VerifierAggregations {
  severities: { buckets: Array<{ key: string; doc_count: number }> };
  distinct_hosts: { value: number };
  with_user_name: { doc_count: number };
  with_rule_name: { doc_count: number };
}

const formatViolations = (violations: string[]): string =>
  violations.map((v, i) => `  ${i + 1}. ${v}`).join('\n');

/**
 * Verify the restored alerts snapshot satisfies the assumptions baked into
 * `alertsRagDataset`. Throws with all violations enumerated so failure is
 * actionable in a single CI log scan.
 *
 * Safe to call against a non-restored cluster (will just report "no open
 * alerts found"); callers in production-like flows should gate on whether
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
  const response = (await esClient.search({
    index: ALERT_INDEX_PATTERN,
    size: 0,
    track_total_hits: true,
    ignore_unavailable: true,
    allow_no_indices: true,
    query: { term: { 'kibana.alert.workflow_status': 'open' } },
    aggs: {
      severities: { terms: { field: 'kibana.alert.severity', size: 10 } },
      distinct_hosts: { cardinality: { field: 'host.name' } },
      with_user_name: { filter: { exists: { field: 'user.name' } } },
      with_rule_name: { filter: { exists: { field: 'kibana.alert.rule.name' } } },
    },
  })) as unknown as {
    hits: { total: { value: number } | number };
    aggregations?: VerifierAggregations;
  };

  const totalOpenAlerts =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggs = response.aggregations;
  const severities = new Set((aggs?.severities.buckets ?? []).map((b) => b.key));
  const distinctHosts = aggs?.distinct_hosts.value ?? 0;
  const openAlertsWithUserName = aggs?.with_user_name.doc_count ?? 0;
  const openAlertsWithRuleName = aggs?.with_rule_name.doc_count ?? 0;

  const violations: string[] = [];
  const inv = ALERTS_RAG_DATASET_INVARIANTS;

  if (totalOpenAlerts < inv.minOpenAlerts) {
    violations.push(
      `expected ≥${inv.minOpenAlerts} open alerts in ${ALERT_INDEX_PATTERN}, ` +
        `found ${totalOpenAlerts}`
    );
  }

  const hasRequiredSeverity = inv.requiredSeverities.some((s) => severities.has(s));
  if (!hasRequiredSeverity) {
    violations.push(
      `expected at least one open alert with severity in [${inv.requiredSeverities.join(
        ', '
      )}], found severities: [${Array.from(severities).join(', ') || '(none)'}]`
    );
  }

  if (distinctHosts < inv.minDistinctHosts) {
    violations.push(
      `expected ≥${inv.minDistinctHosts} distinct host.name across open alerts, ` +
        `found ${distinctHosts}`
    );
  }

  if (openAlertsWithUserName < inv.minOpenAlertsWithUserName) {
    violations.push(
      `expected ≥${inv.minOpenAlertsWithUserName} open alert(s) with user.name populated, ` +
        `found ${openAlertsWithUserName}`
    );
  }

  if (openAlertsWithRuleName < inv.minOpenAlertsWithRuleName) {
    violations.push(
      `expected ≥${inv.minOpenAlertsWithRuleName} open alert(s) with kibana.alert.rule.name ` +
        `populated, found ${openAlertsWithRuleName}`
    );
  }

  if (violations.length > 0) {
    throw new Error(
      `[alerts-rag] restored snapshot does not satisfy dataset invariants. ` +
        `The dataset in alertsRagDataset.ts assumes a specific shape of data ` +
        `(see ALERTS_RAG_DATASET_INVARIANTS); the snapshot at ` +
        `gs://${ALERTS_RAG_DATASET_SNAPSHOT.bucket}/${ALERTS_RAG_DATASET_SNAPSHOT.basePath} ` +
        `must either be updated or the dataset's reference answers re-aligned. ` +
        `Violations:\n${formatViolations(violations)}`
    );
  }

  log.info(
    `[alerts-rag] snapshot invariants OK ` +
      `(open alerts=${totalOpenAlerts}, severities=[${Array.from(severities).join(
        ', '
      )}], distinct hosts=${distinctHosts}, ` +
      `open with user.name=${openAlertsWithUserName}, ` +
      `open with rule.name=${openAlertsWithRuleName})`
  );
};
