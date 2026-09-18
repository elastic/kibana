/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { DEEP_WATCH_FORENSICS_REPORTS_INDEX } from '../constants';

/**
 * L4 durable-outcome gate for the Forensics Watch worker.
 *
 * Two false-greens were fixed here:
 *
 *   1. The report search accepted ANY `report_status: DRAFT` document written in
 *      the last five minutes. A report from an earlier spec, a retry, another
 *      model, or a concurrent run satisfied `persistedCount > 0` even when this
 *      invocation persisted nothing. The gate now requires the document to carry
 *      THIS run's identifier.
 *   2. `hasEvaluationRecordShape` was computed and logged but never included in
 *      `success`, so a malformed stored document still produced a green
 *      durable-outcome test. It is part of the gate now.
 *
 * Correlation is applied in JS after a run-scoped query rather than inside it:
 * the run id is echoed into whichever free-text field the worker writes, so the
 * ES field path is not stable, and an identity check buried in a query string is
 * not unit-testable. The query bounds the window; `evaluateDurableReport` does
 * the identity and shape checks.
 */

export interface ReportHit {
  _source?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Fields the Evaluation Record contract requires on a stored report. */
export const EVALUATION_RECORD_FIELDS = [
  'report_status',
  'timeline',
  'validated_iocs',
  'unresolved_questions',
  'confidence_assessment',
] as const;

export interface DurableReportEvaluation {
  /** DRAFT reports written since the run started. */
  recentCount: number;
  /** Recent reports carrying this run's identifier. */
  correlatedCount: number;
  /** Correlated reports with a complete Evaluation Record shape. */
  shapeValidCount: number;
  missingFields: string[];
  success: boolean;
}

const documentOf = (hit: ReportHit): Record<string, unknown> =>
  (hit._source ?? (hit as Record<string, unknown>)) as Record<string, unknown>;

export const hasEvaluationRecordShape = (doc: Record<string, unknown>): boolean =>
  EVALUATION_RECORD_FIELDS.every((field) => doc[field] !== undefined);

export const missingEvaluationRecordFields = (doc: Record<string, unknown>): string[] =>
  EVALUATION_RECORD_FIELDS.filter((field) => doc[field] === undefined);

const timestampOf = (hit: ReportHit): number | undefined => {
  const raw = documentOf(hit)['@timestamp'];
  if (typeof raw !== 'string') return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Search the reports index for drafts written since `runStartedAt`.
 *
 * Not exported as an ES query builder used verbatim — the spec passes the result
 * straight to `esClient.search`.
 */
export const buildReportReadbackSearch = ({
  runStartedAt,
  size = 10,
}: {
  runStartedAt: string;
  size?: number;
}) => ({
  index: DEEP_WATCH_FORENSICS_REPORTS_INDEX,
  size,
  sort: [{ '@timestamp': 'desc' }],
  query: {
    bool: {
      must: [
        { match: { report_status: 'DRAFT' } },
        { range: { '@timestamp': { gte: runStartedAt } } },
      ],
    },
  },
});

export const evaluateDurableReport = ({
  runId,
  runStartedAt,
  hits,
}: {
  runId: string;
  runStartedAt: string;
  hits: ReportHit[];
}): DurableReportEvaluation => {
  const runStartedAtMs = Date.parse(runStartedAt);
  const hasValidRunStart = !Number.isNaN(runStartedAtMs);

  const recent = hits.filter((hit) => {
    const ts = timestampOf(hit);
    if (ts === undefined) return false; // no timestamp == cannot prove recency
    return !hasValidRunStart || ts >= runStartedAtMs;
  });

  const correlated = recent.filter((hit) => JSON.stringify(documentOf(hit)).includes(runId));

  const shaped = correlated.filter((hit) => hasEvaluationRecordShape(documentOf(hit)));
  const missingFields =
    shaped.length === 0 && correlated.length > 0
      ? missingEvaluationRecordFields(documentOf(correlated[0]))
      : [];

  return {
    recentCount: recent.length,
    correlatedCount: correlated.length,
    shapeValidCount: shaped.length,
    missingFields,
    success: correlated.length > 0 && shaped.length > 0,
  };
};

/** Convenience wrapper the spec calls; keeps the ES call shape in one place. */
export const readBackReports = async (
  esClient: Client,
  { runStartedAt }: { runStartedAt: string }
): Promise<ReportHit[]> => {
  const res = await esClient.search(buildReportReadbackSearch({ runStartedAt }));
  return (res.hits?.hits ?? []) as unknown as ReportHit[];
};
