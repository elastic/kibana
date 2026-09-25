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
  report_ids?: string[];
  spaceId: string;
  /** 1-10, default 10. */
  limit?: number;
}

export interface CandidateQueryResult {
  ids: string[];
  skipped: Array<{
    id: string;
    reason: 'open_proposal' | 'already_hunted' | 'not_found';
  }>;
  total: number;
  truncated: boolean;
}

/** Injected rather than imported so the route owns the proposals-service wiring and tests can stub it. */
export type OpenProposalConversationIdsReader = (spaceId: string) => Promise<Set<string>>;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10;

/** Exclusion happens after the search, so asking for exactly `limit` could under-fill the page. */
const OVERFETCH_MULTIPLIER = 3;

/**
 * Pages one scheduled sweep walks before it stops and says so. Without a bound a
 * pool where every report carries an open Proposal would search until the pool ran
 * out; without paging at all the sweep could only ever see the first page, so a
 * top-ranked run of open Proposals would hide every eligible report behind it from
 * this and every later sweep alike.
 */
const MAX_SELECTION_PAGES = 5;

/**
 * Both callers below must fail closed: an empty result would read as "nothing
 * to hunt" and hide a broken index or store behind a clean 200.
 */
const failClosed = (logger: Logger, context: string, err: unknown): never => {
  const message = (err as Error).message;
  logger.error(`build_candidate_query: ${context}, refusing to select candidates. ${message}`);
  throw err;
};

export const buildCandidateQuery = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  params: CandidateQueryParams,
  readOpenProposalConversationIds?: OpenProposalConversationIdsReader
): Promise<CandidateQueryResult> => {
  const { trigger, report_ids, spaceId, limit: rawLimit } = params;
  const limit = Math.min(rawLimit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const namedIds =
    trigger === 'manual' && report_ids && report_ids.length > 0 ? report_ids : undefined;

  const filterClauses: Array<Record<string, unknown>> = [buildHuntSpaceFilterTerms(spaceId)];

  if (namedIds) {
    // Manual bypass lifts the hunt-once gate for these ids (replay semantics); the
    // open-proposal guard below still applies.
    filterClauses.push({ ids: { values: namedIds } });
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

  // Manual selection has to see every named id, not just the first `limit` of them:
  // an id the search never reached is indistinguishable from an absent one below, and
  // would be reported as `not_found` although it exists. The request schema bounds
  // `report_ids`, so this stays small. Only the scheduled sweep needs overfetch
  // headroom, and only it pages.
  const pageSize = namedIds ? namedIds.length : limit * OVERFETCH_MULTIPLIER;

  const searchPage = async (excludedIds: string[]) => {
    try {
      return await esClient.search({
        index: HUNT_REPORTS_INDEX,
        size: pageSize,
        // The reports index is required, not optional. Ignoring it when it is
        // unavailable turns a missing index into a successful empty page, and an
        // empty candidate pool reads exactly like "nothing is eligible to hunt".
        // Let the search fail instead, so `failClosed` reports it as the outage it
        // is.
        ignore_unavailable: false,
        track_total_hits: true,
        _source: false,
        sort,
        query: {
          bool: {
            filter: filterClauses,
            ...(excludedIds.length > 0 && { must_not: [{ ids: { values: excludedIds } }] }),
          },
        },
      });
    } catch (err) {
      throw failClosed(logger, 'ES search failed', err);
    }
  };

  // A report whose Hunt Proposal is still awaiting a decision is excluded from selection,
  // so an unattended sweep cannot revisit reports while their approval gates are parked.
  const skipped: CandidateQueryResult['skipped'] = [];
  let openProposalConversationIds: Set<string> | undefined;
  if (readOpenProposalConversationIds) {
    try {
      openProposalConversationIds = await readOpenProposalConversationIds(spaceId);
    } catch (err) {
      throw failClosed(logger, 'could not read open proposals', err);
    }
  }

  const ids: string[] = [];
  // Every id this sweep has looked at, excluded from the next page. `from` would be
  // the obvious way to page and is the wrong one here: nothing writes
  // `corroborated_rank_score` or `rank_score` yet, so reports tie at `missing: 0` and
  // the sort is not stable between requests, which lets `from` return a report twice
  // or step over one entirely. Excluding by id takes the examined prefix out of the
  // result set instead, so neither can happen and the window never deepens.
  const examined: string[] = [];
  let total = 0;
  let poolExhausted = false;

  for (let page = 0; page < MAX_SELECTION_PAGES; page++) {
    const response = await searchPage([...examined]);
    const pageIds = (response.hits.hits ?? [])
      .map((h) => h._id)
      .filter((id): id is string => typeof id === 'string');

    if (page === 0) {
      // Read before any id exclusion narrows it, so `total` keeps meaning every report
      // matching the selection filter, which is what `truncated` is measured against.
      total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? pageIds.length;
    }

    for (const id of pageIds) {
      examined.push(id);
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

    if (namedIds) break;
    // A short page has nothing after it, so the pool is genuinely spent rather than
    // merely unexamined. The difference is what the warning below turns on.
    if (pageIds.length < pageSize) {
      poolExhausted = true;
      break;
    }
    if (ids.length >= limit) break;
  }

  // Named ids that matched nothing are reported rather than silently dropped: from the
  // caller's side an unknown id and an id in another space are both "not selected".
  if (namedIds) {
    const matched = new Set(examined);
    for (const requested of namedIds) {
      if (!matched.has(requested)) {
        skipped.push({ id: requested, reason: 'not_found' });
      }
    }
  }

  if (!namedIds && !poolExhausted && ids.length < limit) {
    logger.warn(
      `build_candidate_query: stopped after ${MAX_SELECTION_PAGES} pages having examined ` +
        `${examined.length} reports, with ${ids.length} of ${limit} candidates selected and ` +
        `${skipped.length} skipped for open Proposals. Eligible reports may sit past the examined ` +
        `prefix; they are reachable by the next sweep only once some of those Proposals are decided.`
    );
  }

  const truncated = ids.length < total - skipped.length;

  logger.debug(
    `build_candidate_query: trigger=${trigger} space=${spaceId} ids=${ids.length} skipped=${skipped.length} total=${total} truncated=${truncated}`
  );

  return { ids, skipped, total, truncated };
};
