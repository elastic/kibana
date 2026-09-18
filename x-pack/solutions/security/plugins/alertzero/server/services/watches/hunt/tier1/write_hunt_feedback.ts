/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildHuntSpaceFilterTerms } from '../common/space_filter';
import type { HuntForThreatResult } from './types';

/**
 * Hunt-feedback writer (plan.md Phase 4, F4).
 *
 * Ported from mustard's `write_hunt_feedback.ts` with four deltas called out
 * in plan.md's task list:
 *
 *   4.2 Collapse Tier 1's three raw statuses to `hit` | `clean` for the
 *       `feedback.last_hunt_status` field. A blocked scope (A2) never
 *       reaches this writer at all — the caller checks A2's status before
 *       running Tier 1, so "blocked writes nothing" is enforced by the
 *       caller, not here.
 *   4.3 Add `last_hunt_run_id` (required — every write is tied to the
 *       Investigation run that produced it) and `last_hunt_hit_count`
 *       (optional, omitted on zero hits rather than written as 0, so a
 *       report that has never had a hit has no `last_hunt_hit_count` key
 *       at all).
 *   4.4 Disjoint field-set write: the update doc's keys are asserted (in
 *       tests) to be a subset of `HUNT_FEEDBACK_OWNED_FIELDS`, and the ES
 *       `_update` call uses `retry_on_conflict: 3` so a concurrent
 *       extraction-pipeline rewrite of unrelated fields on the same
 *       document (e.g. `attribution.*`) cannot spuriously fail this write.
 *   4.5 Drop the log-and-swallow `writeHuntFeedbackSafe` wrapper entirely.
 *       `writeHuntFeedback` now rejects on failure; the caller (the hunt
 *       coordinator, Phase 6) decides whether a feedback-write failure
 *       fails the run.
 *   4.6 Space-scope the write: `resolveHuntFeedbackTarget` filters its
 *       lookup search with `buildHuntSpaceFilterTerms(spaceId)` so a hunt
 *       run in space A can never resolve, and then update, a report that
 *       only exists tagged for space B (or only for the global sentinel
 *       read path, which is read-only by design).
 */

const MAX_BOOST = 0.5;
const IOC_BOOST_WEIGHT = 0.15;
const TTP_BOOST_WEIGHT = 0.1;

/** Collapsed hunt outcome persisted to `feedback.last_hunt_status` (plan.md task 4.2). */
export type CollapsedHuntStatus = 'hit' | 'clean';

/**
 * Collapses Tier 1's three raw statuses down to `hit` | `clean`. Only
 * `environment_hits_found` with a confirmed hit in a required index counts
 * as `hit` — `no_environment_hits` and `no_searchable_terms` both collapse
 * to `clean` (nothing actionable was found, whether or not there was
 * anything to search).
 */
export const collapseHuntStatus = (tier1: HuntForThreatResult): CollapsedHuntStatus =>
  tier1.hasConfirmedHit ? 'hit' : 'clean';

export interface HuntFeedbackTarget {
  /** Concrete backing index — `_update` cannot target a data-stream alias. */
  index: string;
  /** Document id within the backing index. */
  id: string;
  /** Existing `rank_score` (if any) used to derive `corroborated_rank_score`. */
  rankScore?: number;
}

export interface HuntFeedbackInputs {
  target: HuntFeedbackTarget;
  tier1: HuntForThreatResult;
  /** The Investigation run this write is attributed to (plan.md task 4.3). */
  runId: string;
  /** Override the wall-clock — primarily a test seam. */
  now?: Date;
}

export interface HuntFeedbackWrite {
  feedback: {
    ioc_hit_count: number;
    ttp_hit_count: number;
    affected_host_count: number;
    affected_user_count: number;
    last_hunted_at: string;
    last_hunt_status: CollapsedHuntStatus;
    last_hunt_window?: { from: string; to: string };
    last_hunt_run_id: string;
    /** Omitted (never written as 0) when the run found zero hits. */
    last_hunt_hit_count?: number;
  };
  /** Omitted (rather than zero) when the base `rank_score` is unknown. */
  corroborated_rank_score?: number;
}

/**
 * Bounded, monotone, log-based boost factor — ported verbatim from mustard.
 *
 *   boost(0, 0)   = 0          → corroborated == rank_score
 *   boost(1, 0)   ≈ 0.10       → 10% lift on first matching IOC
 *   boost(10, 0)  ≈ 0.36       → diminishing returns
 *   boost(100, 0) = 0.50       → clamped
 *   boost(*, *)   ≤ 0.50       → noisy reports can never exceed 1.5×
 */
export const computeBoost = (iocHits: number, ttpHits: number): number => {
  const safeIoc = Math.max(0, iocHits);
  const safeTtp = Math.max(0, ttpHits);
  const raw = IOC_BOOST_WEIGHT * Math.log1p(safeIoc) + TTP_BOOST_WEIGHT * Math.log1p(safeTtp);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(MAX_BOOST, raw);
};

/**
 * Pure builder for the partial doc sent to `_update`. Split out from the
 * network call so tests can assert the exact shape / arithmetic without an
 * ES client mock.
 */
export const buildHuntFeedbackDoc = ({
  target,
  tier1,
  runId,
  now = new Date(),
}: HuntFeedbackInputs): HuntFeedbackWrite => {
  const iocHits = Math.max(0, tier1.counts.totalHits ?? 0);
  // Tier 1 does not currently split IOC- vs technique-hit counts on its
  // returned `counts` block; conservatively treat
  // `searchedTechniques > 0 ? totalHits : 0` as the upper bound on TTP
  // hits, matching mustard's approximation. The smaller TTP boost weight
  // (see `computeBoost`) keeps this from materially inflating
  // `corroborated_rank_score`.
  const ttpHits = tier1.searchedTechniques > 0 ? iocHits : 0;

  const feedback: HuntFeedbackWrite['feedback'] = {
    ioc_hit_count: iocHits,
    ttp_hit_count: ttpHits,
    affected_host_count: Math.max(0, tier1.counts.affectedHosts ?? 0),
    affected_user_count: Math.max(0, tier1.counts.affectedUsers ?? 0),
    last_hunted_at: now.toISOString(),
    last_hunt_status: collapseHuntStatus(tier1),
    last_hunt_run_id: runId,
  };
  if (tier1.timeRange) {
    feedback.last_hunt_window = { from: tier1.timeRange.from, to: tier1.timeRange.to };
  }
  if (iocHits > 0) {
    feedback.last_hunt_hit_count = iocHits;
  }

  const write: HuntFeedbackWrite = { feedback };
  if (typeof target.rankScore === 'number' && Number.isFinite(target.rankScore)) {
    const boost = computeBoost(iocHits, ttpHits);
    write.corroborated_rank_score = target.rankScore * (1 + boost);
  }
  return write;
};

/**
 * Convenience lookup for callers that don't already have the report's
 * `{ index, rankScore }` cached. Returns `undefined` when the report is
 * missing, or not visible from `spaceId` — the coordinator treats this as
 * "skip feedback, the report id is stale or out of scope for this space".
 */
export const resolveHuntFeedbackTarget = async (
  esClient: ElasticsearchClient,
  reportsIndexPattern: string,
  reportId: string,
  spaceId: string
): Promise<HuntFeedbackTarget | undefined> => {
  const response = await esClient.search({
    index: reportsIndexPattern,
    size: 1,
    query: {
      bool: { filter: [buildHuntSpaceFilterTerms(spaceId), { ids: { values: [reportId] } }] },
    },
    _source: ['rank_score'],
  });
  const hit = response.hits.hits[0];
  if (!hit) return undefined;
  const source = hit._source as { rank_score?: number } | undefined;
  return {
    index: hit._index,
    id: hit._id ?? reportId,
    rankScore: typeof source?.rank_score === 'number' ? source.rank_score : undefined,
  };
};

/**
 * Issues the partial-doc `_update` against the resolved backing index, with
 * `retry_on_conflict` so a concurrent extraction-pipeline rewrite of
 * unrelated fields cannot spuriously fail this write (plan.md task 4.4).
 * Rejects on failure — the caller (Phase 6's coordinator) decides whether a
 * feedback-write failure fails the run (plan.md task 4.5; no
 * log-and-swallow wrapper here).
 */
export const writeHuntFeedback = async (
  esClient: ElasticsearchClient,
  inputs: HuntFeedbackInputs
): Promise<HuntFeedbackWrite> => {
  const doc = buildHuntFeedbackDoc(inputs);
  await esClient.update({
    index: inputs.target.index,
    id: inputs.target.id,
    doc,
    retry_on_conflict: 3,
  });
  return doc;
};

/**
 * Flattens a {@link HuntFeedbackWrite} to its dotted top-level key set, for
 * asserting disjointness against {@link HUNT_FEEDBACK_OWNED_FIELDS} in
 * tests (plan.md task 4.4).
 */
export const huntFeedbackWriteKeys = (doc: HuntFeedbackWrite): string[] => {
  const keys = Object.keys(doc.feedback).map((key) => `feedback.${key}`);
  if (doc.corroborated_rank_score !== undefined) {
    keys.push('corroborated_rank_score');
  }
  return keys;
};
