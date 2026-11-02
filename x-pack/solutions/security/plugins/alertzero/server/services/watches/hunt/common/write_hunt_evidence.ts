/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { HuntCompleteness } from '@kbn/alertzero-common';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
import { MAX_HUNT_TECHNIQUE_IDS } from './hunt_technique_limit';
import { buildHuntSpaceFilterTerms } from './space_filter';

export type LastHuntStatus = 'hit' | 'clean' | 'incomplete';

/**
 * Whether `reportId` is reachable from `spaceId`, using the same filter `loadReportHuntContext`
 * reads through.
 *
 * {@link writeHuntEvidence} runs as the internal user, which can reach every space's reports, and
 * appends a fresh `evidence` element when no element matches the space. So the route's feature
 * privilege -- which only says the caller may write in the space it called from -- is not enough on
 * its own: without this check an id from another space would have hunt evidence stamped onto it.
 */
export const isReportVisibleToSpace = async (
  esClient: ElasticsearchClient,
  { spaceId, reportId }: { spaceId: string; reportId: string }
): Promise<boolean> => {
  const response = await esClient.search({
    index: HUNT_REPORTS_INDEX,
    size: 1,
    ignore_unavailable: true,
    _source: false,
    track_total_hits: false,
    query: {
      bool: {
        filter: [buildHuntSpaceFilterTerms(spaceId), { ids: { values: [reportId] } }],
      },
    },
  });

  return response.hits.hits.length > 0;
};

/**
 * Collapses the coordinator's hit/completeness pair to exactly the three statuses
 * `HUNT_STATUS_LABELS` in the threat attachment renders. A hit wins over everything else; absent
 * one, `clean` is a claim about the environment that only a run which covered what it was asked to
 * can make, so anything short of `complete` is `incomplete` rather than `clean`.
 */
export const deriveLastHuntStatus = ({
  hasConfirmedHit,
  completeness,
}: {
  hasConfirmedHit: boolean;
  completeness: HuntCompleteness;
}): LastHuntStatus => {
  if (hasConfirmedHit) return 'hit';
  if (completeness === 'complete') return 'clean';
  return 'incomplete';
};

/**
 * Scripted per-space upsert into the nested `evidence` array. Update API (not Bulk): Bulk rejects
 * scripts on indices with `semantic_text`. Sets only the hunt keys on the matched (or newly
 * appended) element, never the whole element: `evidence` is shared with the Attribute Alerts task,
 * which sets a disjoint set of keys (`alert_hits*`) on the same per-space element. A blind replace
 * here would erase that space's alert-attribution fields.
 *
 * Two groups of keys with different lifetimes. The stamp (`last_hunt_*`) is written only when
 * `params.stamp` is true: it is the hunt-once gate and a run that must be retried has to leave it
 * unset. The coverage ledger (`hunted_technique_ids`, `pending_technique_ids`,
 * `coverage_pending`) is written on every run: searched ids are unioned with what earlier runs
 * recorded, so a later run can skip them, and the cap keeps the array within the contract's bound.
 * The pending ids are the techniques a later run still owes, replaced by each run that reached
 * Tier 2 (it saw every earlier pending id) and left alone by one that did not. They exist only
 * while coverage is pending, so a settled report carries none.
 *
 * Two guards keep the stored state honest. A continuation (the element is `coverage_pending`, and
 * the run did not replay the whole report) never downgrades a `hit`: it skipped the techniques the hit came from, so its own `clean` or
 * `incomplete` says nothing against the finding, and the hit keeps its status, run id and count
 * (`last_hunted_at` still moves). And a ledger that cannot hold the whole union settles
 * `coverage_pending` instead of leaving it set: ids past the cap are dropped, so a report that
 * stayed pending would re-search the same techniques on every sweep and never gain ground. That
 * settle also stamps, whatever the run found: the candidate gate retires a report only on
 * `last_hunted_at`, so a settled flag without a stamp would leave the report in the pool, re-hunting
 * the techniques the cap dropped on every sweep.
 */
const EVIDENCE_SCRIPT = `
if (!(ctx._source.evidence instanceof List)) { ctx._source.evidence = new ArrayList(); }
boolean found = false;
for (int i = 0; i < ctx._source.evidence.size(); i++) {
  if (ctx._source.evidence[i].space_id == params.space_id) {
    def el = ctx._source.evidence[i];
    boolean keepHit = !params.replayed_whole_report && el.coverage_pending == true && el.last_hunt_status == 'hit' && params.last_hunt_status != 'hit';
    Set ids = new LinkedHashSet();
    if (el.hunted_technique_ids instanceof List) { ids.addAll(el.hunted_technique_ids); }
    ids.addAll(params.searched_technique_ids);
    List capped = new ArrayList();
    for (def id : ids) { if (capped.size() < params.max_ids) { capped.add(id); } }
    el.hunted_technique_ids = capped;
    boolean pending = params.coverage_pending && ids.size() <= params.max_ids;
    boolean settledByCap = params.coverage_pending && !pending;
    if (params.stamp || settledByCap) {
      el.last_hunted_at = params.last_hunted_at;
      if (!keepHit) {
        el.last_hunt_status = params.last_hunt_status;
        el.last_hunt_run_id = params.last_hunt_run_id;
        el.last_hunt_event_hit_count = params.last_hunt_event_hit_count;
      }
    }
    el.coverage_pending = pending;
    if (!pending) {
      el.pending_technique_ids = new ArrayList();
    } else if (params.pending_technique_ids != null) {
      List pendingIds = new ArrayList();
      for (def id : params.pending_technique_ids) { if (pendingIds.size() < params.max_ids) { pendingIds.add(id); } }
      el.pending_technique_ids = pendingIds;
    }
    found = true;
  }
}
if (!found) {
  Map el = new HashMap();
  el.space_id = params.space_id;
  List capped = new ArrayList();
  for (def id : params.searched_technique_ids) { if (capped.size() < params.max_ids) { capped.add(id); } }
  el.hunted_technique_ids = capped;
  boolean pending = params.coverage_pending && params.searched_technique_ids.size() <= params.max_ids;
  boolean settledByCap = params.coverage_pending && !pending;
  if (params.stamp || settledByCap) {
    el.last_hunted_at = params.last_hunted_at;
    el.last_hunt_status = params.last_hunt_status;
    el.last_hunt_run_id = params.last_hunt_run_id;
    el.last_hunt_event_hit_count = params.last_hunt_event_hit_count;
  }
  el.coverage_pending = pending;
  List pendingIds = new ArrayList();
  if (pending && params.pending_technique_ids != null) {
    for (def id : params.pending_technique_ids) { if (pendingIds.size() < params.max_ids) { pendingIds.add(id); } }
  }
  el.pending_technique_ids = pendingIds;
  ctx._source.evidence.add(el);
}
`.trim();

interface LedgerElement {
  space_id?: string;
  coverage_pending?: boolean;
}

interface LedgerSource {
  evidence?: LedgerElement[];
}

export interface WriteHuntEvidenceParams {
  spaceId: string;
  reportId: string;
  runId: string;
  hasConfirmedHit: boolean;
  completeness: HuntCompleteness;
  /** Tier 1's total-hits count for this run; `0` says the run searched and found nothing. */
  totalHits: number;
  /** Techniques this run searched, unioned into the report's per-space coverage ledger. */
  searchedTechniqueIds?: string[];
  /**
   * Techniques this run could not search but a later one still should. Replaces what the report
   * recorded; leave it undefined when Tier 2 did not run, which keeps the recorded list.
   */
  pendingTechniqueIds?: string[];
  /**
   * Whether this run replayed the whole report (a manual run that skipped nothing). Its result then
   * replaces an earlier finding even while coverage was pending, provided the replay itself finished
   * `complete`: a replay that left part of the report unsearched cannot overrule a hit. Otherwise a
   * pending `hit` is kept.
   */
  replayedWholeReport?: boolean;
}

/**
 * Whether a run settles the report's hunt-once gate. A confirmed hit always does, whatever the
 * completeness: the hit is a finding, and a report that has produced one is not unhunted. A run
 * that found nothing settles it only when repeating it could not cover more, i.e. anything but
 * `incomplete_retryable`.
 */
export const shouldStampHunt = ({
  hasConfirmedHit,
  completeness,
}: {
  hasConfirmedHit: boolean;
  completeness: HuntCompleteness;
}): boolean => hasConfirmedHit || completeness !== 'incomplete_retryable';

/**
 * Records a hunt run on a report's per-space evidence: stamps the hunt-once gate (`last_hunted_at`
 * and siblings) when {@link shouldStampHunt} says the run settles it, and always updates the
 * coverage ledger. Internal user: `.kibana-threat-reports` is plugin-owned and hidden, and Kibana
 * feature privileges grant no Elasticsearch privileges on it, so the calling user's client fails
 * for every non-superuser. Update, not upsert: the caller only reaches this after loading the
 * report by this same id, so a missing doc must fail loudly rather than materialize a partial row.
 */
export const writeHuntEvidence = async (
  esClient: ElasticsearchClient,
  {
    spaceId,
    reportId,
    runId,
    hasConfirmedHit,
    completeness,
    totalHits,
    searchedTechniqueIds = [],
    pendingTechniqueIds,
    replayedWholeReport = false,
  }: WriteHuntEvidenceParams,
  logger: Logger
): Promise<void> => {
  const stamp = shouldStampHunt({ hasConfirmedHit, completeness });
  // A retryable run that found nothing, searched nothing and left nothing pending (a blocked
  // scope, no model) has nothing to record: no stamp, and a ledger with no ids says nothing a
  // later run could use.
  if (!stamp && searchedTechniqueIds.length === 0 && (pendingTechniqueIds ?? []).length === 0) {
    return;
  }

  const coveragePending = completeness === 'incomplete_retryable';
  const response = await esClient.update<unknown, unknown, LedgerSource>({
    index: HUNT_REPORTS_INDEX,
    id: reportId,
    retry_on_conflict: 3,
    // Read back only the ledger, to tell whether the cap settled a run that wanted to continue.
    _source_includes: ['evidence.space_id', 'evidence.coverage_pending'],
    script: {
      lang: 'painless',
      source: EVIDENCE_SCRIPT,
      params: {
        space_id: spaceId,
        stamp,
        last_hunted_at: new Date().toISOString(),
        last_hunt_status: deriveLastHuntStatus({ hasConfirmedHit, completeness }),
        last_hunt_run_id: runId,
        last_hunt_event_hit_count: totalHits,
        searched_technique_ids: searchedTechniqueIds,
        pending_technique_ids: pendingTechniqueIds ?? null,
        replayed_whole_report: replayedWholeReport && completeness === 'complete',
        coverage_pending: coveragePending,
        max_ids: MAX_HUNT_TECHNIQUE_IDS,
      },
    },
  });

  const stored = response.get?._source?.evidence?.find((element) => element.space_id === spaceId);
  if (coveragePending && stored?.coverage_pending === false) {
    logger.warn(
      `Hunt coverage ledger for report ${reportId} in space ${spaceId} holds more than ` +
        `${MAX_HUNT_TECHNIQUE_IDS} techniques, so coverage was settled with techniques still unsearched.`
    );
  }
};
