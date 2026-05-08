/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type {
  SigEventEvidenceCheckEvaluation,
  SigEventEvidenceCheckItem,
  SymptomStatus,
} from './sig_event_evidence_types';

interface EvidenceRow {
  readonly esql_query: string;
  readonly result: string;
  readonly rule_name: string;
}

export interface SigEventDocumentForEvidence {
  readonly evidences?: ReadonlyArray<EvidenceRow & { row_count?: number }>;
}

/** Returns promoted (`found`) evidence rows that define a non-empty ES|QL query. */
export const getPromotedSigEventEvidencesWithEsql = (
  document: SigEventDocumentForEvidence
): ReadonlyArray<EvidenceRow> =>
  (document.evidences ?? []).filter(
    (e) =>
      typeof e.esql_query === 'string' && e.esql_query.trim().length > 0 && e.result === 'found'
  );

const symptomStatusFromHits = ({
  totalHits,
  consecutiveHealthyWindows,
}: {
  totalHits: number;
  consecutiveHealthyWindows: number;
}): SymptomStatus => {
  if (totalHits === 0 && consecutiveHealthyWindows >= 3) {
    return 'resolved';
  }
  if (totalHits === 0) {
    return 'healthy';
  }
  return 'failing';
};

const recommendationForSymptomStatus = (status: SymptomStatus): string => {
  if (status === 'failing') {
    return 'Evidence queries still return matching rows. Continue investigation or mitigation and re-check.';
  }
  if (status === 'resolved') {
    return 'Evidence queries show no matching rows across stable windows.';
  }
  return 'No evidence matches in the current sample window.';
};

/**
 * Runs one evidence ES|QL query and returns the number of rows in the response.
 */
export async function getSigEventEvidenceEsqlRowCount({
  esClient,
  esql_query,
}: {
  esClient: ElasticsearchClient;
  esql_query: string;
}): Promise<number> {
  const response = (await esClient.esql.query({
    query: esql_query,
    drop_null_columns: true,
    allow_partial_results: true,
  })) as ESQLSearchResponse;

  return response.values?.length ?? 0;
}

/** Turns per-query check results into the aggregate evaluation shape (status, signals, progress). */
export function buildSigEventEvidenceCheckEvaluation({
  evidenceChecks,
  consecutiveHealthyWindows = 0,
  now = new Date(),
}: {
  evidenceChecks: readonly SigEventEvidenceCheckItem[];
  consecutiveHealthyWindows?: number;
  now?: Date;
}): SigEventEvidenceCheckEvaluation {
  const totalHits = evidenceChecks.reduce((sum, c) => sum + c.rowCount, 0);
  const queriesWithMatches = evidenceChecks.filter((c) => c.hasMatches).length;
  const lastSeen =
    evidenceChecks.length === 0
      ? [{ symptomKey: 'no_found_evidences', at: null }]
      : evidenceChecks.map((c) => ({
          symptomKey: c.ruleName,
          at: c.hasMatches ? now.toISOString() : null,
        }));

  const status = symptomStatusFromHits({ totalHits, consecutiveHealthyWindows });

  return {
    status,
    recommendation: recommendationForSymptomStatus(status),
    signals: {
      evidenceRowHits: totalHits,
      eligibleEvidenceCount: evidenceChecks.length,
      evidenceQueriesWithMatches: queriesWithMatches,
    },
    progress: { lastSeen },
    evidenceChecks,
  };
}
