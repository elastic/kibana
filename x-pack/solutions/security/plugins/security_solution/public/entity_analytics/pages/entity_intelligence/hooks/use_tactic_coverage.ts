/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { tactics as MITRE_ENTERPRISE_TACTICS } from '../../../../../common/detection_engine/mitre/mitre_tactics_techniques';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';

const TACTIC_COVERAGE_TIME_RANGE = 'now-30d';
/** Only high-signal alerts inform kill-chain coverage on this executive surface. */
const MATERIAL_ALERT_SEVERITIES = ['high', 'critical'] as const;
/** Distinct tactic buckets to retrieve; the full ATT&CK enterprise matrix is 14. */
const TACTIC_BUCKET_SIZE = 20;
/** Techniques to retrieve per tactic column; keeps the matrix compact. */
const TECHNIQUE_BUCKET_SIZE = 12;

const TACTIC_FIELD = 'kibana.alert.rule.threat.tactic.name';
const TECHNIQUE_ID_FIELD = 'kibana.alert.rule.threat.technique.id';
const TECHNIQUE_NAME_FIELD = 'kibana.alert.rule.threat.technique.name';
const SEVERITY_FIELD = 'kibana.alert.severity';
const RULE_NAME_FIELD = 'kibana.alert.rule.name';
/** Dominant detection rules to surface for the executive brief evidence packet. */
const RULE_BUCKET_SIZE = 6;

/** Total ATT&CK enterprise tactics, the denominator for kill-chain coverage. */
export const TOTAL_MITRE_TACTICS = MITRE_ENTERPRISE_TACTICS.length;

export type MaterialAlertSeverity = (typeof MATERIAL_ALERT_SEVERITIES)[number];

/** A single observed ATT&CK technique cell within a tactic column. */
export interface TechniqueCoverage {
  /** Canonical technique ID when the alert carried one (e.g. "T1078"). */
  techniqueId: string | undefined;
  /** Technique display name (e.g. "Valid Accounts"). */
  techniqueName: string;
  /** Material-risk alerts observed for this technique in the window. */
  alertCount: number;
  /** Highest severity observed for this technique ('critical' outranks 'high'). */
  topSeverity: MaterialAlertSeverity;
}

export interface TacticCoverage {
  /** MITRE tactic display name (e.g. "Initial Access"). */
  tactic: string;
  /** Material-risk alerts observed against this tactic in the window. */
  alertCount: number;
  /** Techniques observed under this tactic, busiest first. */
  techniques: TechniqueCoverage[];
}

export interface TacticCoverageResult {
  tactics: TacticCoverage[];
  /** Total material-risk alerts carrying any tactic in the window. */
  taggedAlertCount: number;
  /** Dominant detection rules across material-risk alerts (busiest first). */
  topRules: RuleCoverage[];
  isLoading: boolean;
  isError: boolean;
}

/** A dominant detection rule observed across material-risk alerts. */
export interface RuleCoverage {
  ruleName: string;
  alertCount: number;
  topSeverity: MaterialAlertSeverity;
}

interface SeverityBucket {
  key: string;
  doc_count: number;
}

interface TechniqueBucket {
  key: string;
  doc_count: number;
  techniqueName?: { buckets: Array<{ key: string; doc_count: number }> };
  severities?: { buckets: SeverityBucket[] };
}

interface TacticBucket {
  key: string;
  doc_count: number;
  techniques?: {
    sum_other_doc_count: number;
    buckets: TechniqueBucket[];
  };
}

interface RuleBucket {
  key: string;
  doc_count: number;
  severities?: { buckets: SeverityBucket[] };
}

interface TacticAggregation {
  tactics?: {
    sum_other_doc_count: number;
    buckets: TacticBucket[];
  };
  rules?: {
    sum_other_doc_count: number;
    buckets: RuleBucket[];
  };
}

const buildTacticCoverageQuery = (): object => ({
  size: 0,
  query: {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: TACTIC_COVERAGE_TIME_RANGE, lte: 'now' } } },
        { terms: { [SEVERITY_FIELD]: [...MATERIAL_ALERT_SEVERITIES] } },
        { exists: { field: TACTIC_FIELD } },
      ],
    },
  },
  aggs: {
    tactics: {
      terms: { field: TACTIC_FIELD, size: TACTIC_BUCKET_SIZE, order: { _count: 'desc' } },
      aggs: {
        techniques: {
          terms: {
            field: TECHNIQUE_ID_FIELD,
            size: TECHNIQUE_BUCKET_SIZE,
            order: { _count: 'desc' },
          },
          aggs: {
            // Recover the human-readable technique name paired with its ID.
            techniqueName: {
              terms: { field: TECHNIQUE_NAME_FIELD, size: 1, order: { _count: 'desc' } },
            },
            severities: {
              terms: { field: SEVERITY_FIELD, size: MATERIAL_ALERT_SEVERITIES.length },
            },
          },
        },
      },
    },
    // Dominant detection rules in the same pass — no extra round-trip. Powers
    // the "which detections are firing" evidence in the executive brief.
    rules: {
      terms: { field: RULE_NAME_FIELD, size: RULE_BUCKET_SIZE, order: { _count: 'desc' } },
      aggs: {
        severities: {
          terms: { field: SEVERITY_FIELD, size: MATERIAL_ALERT_SEVERITIES.length },
        },
      },
    },
  },
});

/** 'critical' outranks 'high' when a technique carries both severities. */
const pickTopSeverity = (buckets: readonly SeverityBucket[]): MaterialAlertSeverity =>
  buckets.some((bucket) => bucket.key === 'critical') ? 'critical' : 'high';

const toTechniqueCoverage = (bucket: TechniqueBucket): TechniqueCoverage => {
  const techniqueId = bucket.key || undefined;
  const techniqueName = bucket.techniqueName?.buckets[0]?.key ?? techniqueId ?? '';
  return {
    techniqueId,
    techniqueName,
    alertCount: bucket.doc_count,
    topSeverity: pickTopSeverity(bucket.severities?.buckets ?? []),
  };
};

/**
 * Aggregates real detection alerts (`.alerts-security.alerts-*` via the
 * detection engine signals search API) by MITRE ATT&CK tactic and, nested
 * beneath each tactic, the individual techniques observed over the last 30
 * days of high/critical alerts. Powers the attack-surface ATT&CK matrix: every
 * count is a live alert count, never a modeled value.
 */
export const useTacticCoverage = (enabled = true): TacticCoverageResult => {
  const { data, isLoading, isError } = useQuery(
    ['entityIntelligenceTacticCoverage', TACTIC_COVERAGE_TIME_RANGE],
    ({ signal }) =>
      fetchQueryAlerts<never, TacticAggregation>({
        query: buildTacticCoverageQuery(),
        signal: signal ?? new AbortController().signal,
      }),
    { enabled, retry: 1, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  const tactics = useMemo<TacticCoverage[]>(
    () =>
      (data?.aggregations?.tactics?.buckets ?? []).map((bucket) => ({
        tactic: bucket.key,
        alertCount: bucket.doc_count,
        techniques: (bucket.techniques?.buckets ?? []).map(toTechniqueCoverage),
      })),
    [data?.aggregations?.tactics?.buckets]
  );

  const taggedAlertCount = useMemo(
    () => tactics.reduce((total, entry) => total + entry.alertCount, 0),
    [tactics]
  );

  const topRules = useMemo<RuleCoverage[]>(
    () =>
      (data?.aggregations?.rules?.buckets ?? [])
        .filter((bucket) => bucket.key)
        .map((bucket) => ({
          ruleName: bucket.key,
          alertCount: bucket.doc_count,
          topSeverity: pickTopSeverity(bucket.severities?.buckets ?? []),
        })),
    [data?.aggregations?.rules?.buckets]
  );

  return { tactics, taggedAlertCount, topRules, isLoading, isError };
};
