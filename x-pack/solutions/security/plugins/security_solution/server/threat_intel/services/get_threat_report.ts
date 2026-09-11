/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  THREAT_REPORTS_INDEX_PATTERN,
  type GetThreatReportResponse,
} from '../../../common/threat_intel';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../lib/es_options';
import { buildSpaceFilterTerms } from '../lib/space_filter';

export class ThreatReportNotFoundError extends Error {
  constructor(reportId: string) {
    super(`Report ${reportId} not found`);
    this.name = 'ThreatReportNotFoundError';
  }
}

/**
 * Loads a threat report by id within the caller's space (+ global catalog).
 * Uses a space-filtered search so a cross-space id returns not-found rather
 * than leaking existence via a direct get.
 */
export const getThreatReport = async (
  esClient: ElasticsearchClient,
  {
    spaceId,
    reportId,
  }: {
    spaceId: string;
    reportId: string;
  }
): Promise<GetThreatReportResponse> => {
  const response = await esClient.search<Record<string, unknown>>({
    index: THREAT_REPORTS_INDEX_PATTERN,
    ...HIDDEN_INDEX_SEARCH_OPTIONS,
    size: 1,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ ids: { values: [reportId] } }, buildSpaceFilterTerms(spaceId)],
      },
    },
  });

  const hit = response.hits.hits[0];
  if (!hit?._id || !hit._source) {
    throw new ThreatReportNotFoundError(reportId);
  }

  const source = hit._source;
  const revision = typeof source.revision === 'number' ? source.revision : 0;

  const result: Record<string, unknown> = {
    ...source,
    reportId: hit._id,
    revision,
  };

  // Nested per-space array (v30). Project the caller's element only (never '*');
  // a legacy flat object is left alone so stale indexes stay distinguishable
  // from "not hunted here".
  if (Array.isArray(source.evidence)) {
    const element = source.evidence.find(
      (el): el is Record<string, unknown> =>
        typeof el === 'object' &&
        el !== null &&
        (el as Record<string, unknown>).space_id === spaceId
    );
    if (element) {
      result.evidence = element;
    } else {
      delete result.evidence;
    }
  }

  return result as GetThreatReportResponse;
};
