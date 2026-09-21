/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical hunt-once candidate selection query. Called by the hunt child workflow and the
 * candidates route; PR 4's Worker YAML never carries a query copy. The fan-out shape is
 * parallel dynamic fan-out with concurrency.max: 10, not mustard's serial foreach. The
 * runbook's replay row states the named-report manual re-run, matching the manual bypass
 * decision.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { HUNT_REPORTS_INDEX } from '../../../../common/constants';
import { buildHuntSpaceFilterTerms } from './space_filter';

export interface CandidateQueryParams {
  trigger: 'manual' | 'scheduled';
  /** For manual bypass: hunt exactly these report ids (bypasses hunt-once gate, still excludes open proposals). */
  reportIds?: string[];
  spaceId: string;
  /** 1–10, default 10. */
  limit?: number;
}

export interface CandidateQueryResult {
  ids: string[];
  skipped: Array<{ id: string; reason: 'open_proposal' | 'already_hunted' | 'not_found' | 'other_space' }>;
  total: number;
  truncated: boolean;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;

export const buildCandidateQuery = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  params: CandidateQueryParams
): Promise<CandidateQueryResult> => {
  const { trigger, reportIds, spaceId, limit: rawLimit } = params;
  const limit = Math.min(rawLimit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const isManualWithIds = trigger === 'manual' && reportIds && reportIds.length > 0;

  // TODO: integrate with proposals service — check for pending/executing Hunt Proposals
  // and return them under skipped with reason: 'open_proposal'. This is PR 3b's concern.
  const skipped: CandidateQueryResult['skipped'] = [];

  const filterClauses: Array<Record<string, unknown>> = [buildHuntSpaceFilterTerms(spaceId)];

  if (isManualWithIds) {
    // Manual bypass: target exactly these report ids. The hunt-once gate is bypassed
    // for explicit ids (replay/re-run semantics), but we still exclude open proposals.
    filterClauses.push({ ids: { values: reportIds } });
  } else {
    // Scheduled trigger: hunt-once gate — only reports never hunted in this space.
    // `feedback.last_hunted_at` exists on a report doc once F4 has written feedback.
    filterClauses.push({
      bool: {
        must_not: [{ exists: { field: 'feedback.last_hunted_at' } }],
      },
    });
  }

  let response;
  try {
    response = await esClient.search({
      index: HUNT_REPORTS_INDEX,
      size: limit,
      ignore_unavailable: true,
      track_total_hits: true,
      _source: false,
      sort: [
        { corroborated_rank_score: { order: 'desc', missing: 0 } },
        { rank_score: { order: 'desc', missing: 0 } },
        { '@timestamp': { order: 'desc' } },
      ],
      query: { bool: { filter: filterClauses } },
    });
  } catch (err) {
    logger.warn(`build_candidate_query: ES search failed — ${(err as Error).message}`);
    return { ids: [], skipped, total: 0, truncated: false };
  }

  const hits = response.hits.hits ?? [];
  const ids = hits.map((h) => h._id).filter((id): id is string => typeof id === 'string');
  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? hits.length;
  const truncated = ids.length < total;

  logger.debug(
    `build_candidate_query: trigger=${trigger} space=${spaceId} ids=${ids.length} total=${total} truncated=${truncated}`
  );

  return { ids, skipped, total, truncated };
};
