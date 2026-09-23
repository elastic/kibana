/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
import { buildHuntSpaceFilterTerms } from './space_filter';
import { buildHuntInvestigationConversationId } from './hunt_investigation_id';

export interface CandidateQueryParams {
  trigger: 'manual' | 'scheduled';
  /** For manual bypass: hunt exactly these report ids (bypasses hunt-once gate, still excludes open proposals). */
  reportIds?: string[];
  spaceId: string;
  /** 1-10, default 10. */
  limit?: number;
}

export interface CandidateQueryResult {
  ids: string[];
  skipped: Array<{
    id: string;
    reason: 'open_proposal' | 'already_hunted' | 'not_found' | 'other_space';
  }>;
  total: number;
  truncated: boolean;
}

/**
 * Returns the conversation ids that currently carry an open Hunt Proposal, so
 * selection can drop their reports. Injected rather than imported so the route
 * owns the proposals-service wiring and the unit tests can stub it.
 */
export type OpenProposalConversationIdsReader = (spaceId: string) => Promise<Set<string>>;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;

/**
 * Over-fetch factor for the scheduled path. Open-proposal exclusion happens
 * after the search, so asking for exactly `limit` would under-fill the page
 * whenever a candidate is dropped.
 */
const OVERFETCH_MULTIPLIER = 3;

export const buildCandidateQuery = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  params: CandidateQueryParams,
  readOpenProposalConversationIds?: OpenProposalConversationIdsReader
): Promise<CandidateQueryResult> => {
  const { trigger, reportIds, spaceId, limit: rawLimit } = params;
  const limit = Math.min(rawLimit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const isManualWithIds = trigger === 'manual' && reportIds && reportIds.length > 0;

  const filterClauses: Array<Record<string, unknown>> = [buildHuntSpaceFilterTerms(spaceId)];

  if (isManualWithIds) {
    // Manual bypass: target exactly these report ids. The hunt-once gate is bypassed
    // for explicit ids (replay/re-run semantics), but the open-proposal guard below
    // still applies.
    filterClauses.push({ ids: { values: reportIds } });
  } else {
    // Scheduled trigger: hunt-once gate, only reports never hunted in this space.
    //
    // Hunt outcomes live in the per-space nested `evidence[]` array on
    // `.kibana-threat-reports` (mapping v30 merged the former top-level
    // `attribution` and `feedback` objects into it). There is no top-level
    // `feedback` field, and the template is `dynamic: strict`, so an `exists`
    // on `feedback.last_hunted_at` matches nothing and the `must_not` would
    // always pass, letting every sweep re-hunt the whole pool. The nested form
    // below is the only one that actually gates.
    filterClauses.push({
      bool: {
        must_not: [
          {
            nested: {
              path: 'evidence',
              query: {
                bool: {
                  filter: [
                    { term: { 'evidence.space_id': spaceId } },
                    { exists: { field: 'evidence.last_hunted_at' } },
                  ],
                },
              },
            },
          },
        ],
      },
    });
  }

  // `corroborated_rank_score` is nested under `evidence` too, so it needs a nested
  // sort bound to this space's element. Sorting it as a top-level field silently
  // does nothing. `rank_score` is genuinely top level and sorts as written.
  const sort: estypes.SortCombinations[] = [
    {
      'evidence.corroborated_rank_score': {
        order: 'desc',
        missing: 0,
        nested: {
          path: 'evidence',
          filter: { term: { 'evidence.space_id': spaceId } },
        },
      },
    },
    { rank_score: { order: 'desc', missing: 0 } },
    { '@timestamp': { order: 'desc' } },
  ];

  let response;
  try {
    response = await esClient.search({
      index: HUNT_REPORTS_INDEX,
      // Manual selection is already bounded by the named ids, so it asks for exactly
      // what it was given; only the scheduled sweep needs headroom for exclusions.
      size: isManualWithIds ? limit : limit * OVERFETCH_MULTIPLIER,
      ignore_unavailable: true,
      track_total_hits: true,
      _source: false,
      sort,
      query: { bool: { filter: filterClauses } },
    });
  } catch (err) {
    // Fail closed by throwing: an empty 200 would look like "no reports to hunt"
    // and hide a broken reports index from the Worker / operator.
    logger.error(
      `build_candidate_query: ES search failed, refusing to select candidates. ${
        (err as Error).message
      }`
    );
    throw err;
  }

  const hits = response.hits.hits ?? [];
  const matchedIds = hits.map((h) => h._id).filter((id): id is string => typeof id === 'string');
  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? matchedIds.length;

  // A report whose Hunt Proposal is still awaiting a decision is excluded from selection,
  // so an unattended sweep cannot revisit reports while their approval gates are parked.
  const skipped: CandidateQueryResult['skipped'] = [];
  let openProposalConversationIds: Set<string> | undefined;
  if (readOpenProposalConversationIds) {
    try {
      openProposalConversationIds = await readOpenProposalConversationIds(spaceId);
    } catch (err) {
      // Failing open here would re-hunt a report whose containment is still parked
      // at a gate, so an unreadable proposal store stops selection instead.
      logger.error(
        `build_candidate_query: could not read open proposals, refusing to select candidates. ${
          (err as Error).message
        }`
      );
      return { ids: [], skipped: [], total, truncated: false };
    }
  }

  const ids: string[] = [];
  for (const id of matchedIds) {
    if (
      openProposalConversationIds &&
      openProposalConversationIds.has(buildHuntInvestigationConversationId(id))
    ) {
      skipped.push({ id, reason: 'open_proposal' });
      continue;
    }
    if (ids.length < limit) {
      ids.push(id);
    }
  }

  // Named ids that matched nothing are reported rather than silently dropped: from the
  // caller's side an unknown id and an id in another space are both "not selected".
  if (isManualWithIds) {
    const matched = new Set(matchedIds);
    for (const requested of reportIds) {
      if (!matched.has(requested)) {
        skipped.push({ id: requested, reason: 'not_found' });
      }
    }
  }

  const truncated = ids.length < total - skipped.length;

  logger.debug(
    `build_candidate_query: trigger=${trigger} space=${spaceId} ids=${ids.length} skipped=${skipped.length} total=${total} truncated=${truncated}`
  );

  return { ids, skipped, total, truncated };
};
