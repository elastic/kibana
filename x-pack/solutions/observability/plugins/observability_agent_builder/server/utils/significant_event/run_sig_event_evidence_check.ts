/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getSignificantEventByEventId } from '../get_significant_event_by_event_id';
import type { SigEventEvidenceCheckItem } from './sig_event_evidence_types';
import {
  buildSigEventEvidenceCheckEvaluation,
  getPromotedSigEventEvidencesWithEsql,
  getSigEventEvidenceEsqlRowCount,
  type SigEventDocumentForEvidence,
} from './evaluate_sig_event_evidences';
import type { SigEventEvidenceCheckResponse } from './sig_event_evidence_types';

export const runSigEventEvidenceCheck = async ({
  esClient,
  eventId,
  index,
}: {
  esClient: ElasticsearchClient;
  eventId: string;
  index: string;
}): Promise<SigEventEvidenceCheckResponse> => {
  const document = await getSignificantEventByEventId({
    esClient,
    eventId,
    index,
  });

  if (!document) {
    throw notFound(`Significant event not found for event_id ${eventId} in ${index}`);
  }

  const promotedEvidences = getPromotedSigEventEvidencesWithEsql(
    document as SigEventDocumentForEvidence
  );
  const evidenceChecks: SigEventEvidenceCheckItem[] = [];

  for (const evidence of promotedEvidences) {
    const ruleName = evidence.rule_name?.trim() || 'evidence';
    try {
      const rowCount = await getSigEventEvidenceEsqlRowCount({
        esClient,
        esql_query: evidence.esql_query,
      });
      evidenceChecks.push({
        ruleName,
        rowCount,
        hasMatches: rowCount > 0,
      });
    } catch (err) {
      evidenceChecks.push({
        ruleName,
        rowCount: 0,
        hasMatches: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    ...buildSigEventEvidenceCheckEvaluation({ evidenceChecks }),
    significantEventId: eventId,
  };
};
