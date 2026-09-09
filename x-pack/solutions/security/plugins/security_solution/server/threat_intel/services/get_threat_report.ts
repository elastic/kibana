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

  // `attribution` is a nested array with one element per space (v29). Readers
  // see only their own space's element, flattened back onto the report.
  // Deliberately `space_id === spaceId` only, never `'*'`: annotation elements
  // are keyed to the executing space even on global reports, the opposite of
  // `buildSpaceFilterTerms`. A legacy flat object (an index not yet dropped and
  // recreated after v29) is passed through unchanged rather than omitted, so a
  // stale deployment stays distinguishable from "not hunted here".
  if (Array.isArray(source.attribution)) {
    const element = source.attribution.find(
      (el): el is Record<string, unknown> =>
        typeof el === 'object' &&
        el !== null &&
        (el as Record<string, unknown>).space_id === spaceId
    );
    if (element) {
      result.attribution = element;
    } else {
      // No element for this space: omit the field entirely ("not hunted here").
      delete result.attribution;
    }
  }

  return result as GetThreatReportResponse;
};
