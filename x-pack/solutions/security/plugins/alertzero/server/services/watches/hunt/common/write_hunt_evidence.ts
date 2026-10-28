/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { HuntCompleteness } from '@kbn/alertzero-common';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
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
 */
const EVIDENCE_SCRIPT = `
if (!(ctx._source.evidence instanceof List)) { ctx._source.evidence = new ArrayList(); }
boolean found = false;
for (int i = 0; i < ctx._source.evidence.size(); i++) {
  if (ctx._source.evidence[i].space_id == params.space_id) {
    ctx._source.evidence[i].last_hunted_at = params.last_hunted_at;
    ctx._source.evidence[i].last_hunt_status = params.last_hunt_status;
    ctx._source.evidence[i].last_hunt_run_id = params.last_hunt_run_id;
    ctx._source.evidence[i].last_hunt_event_hit_count = params.last_hunt_event_hit_count;
    found = true;
  }
}
if (!found) {
  Map el = new HashMap();
  el.space_id = params.space_id;
  el.last_hunted_at = params.last_hunted_at;
  el.last_hunt_status = params.last_hunt_status;
  el.last_hunt_run_id = params.last_hunt_run_id;
  el.last_hunt_event_hit_count = params.last_hunt_event_hit_count;
  ctx._source.evidence.add(el);
}
`.trim();

export interface WriteHuntEvidenceParams {
  spaceId: string;
  reportId: string;
  runId: string;
  hasConfirmedHit: boolean;
  completeness: HuntCompleteness;
  /** Tier 1's total-hits count for this run; `0` says the run searched and found nothing. */
  totalHits: number;
}

/**
 * Stamps the space's hunt-once gate (`last_hunted_at` and siblings) on a report. Internal user:
 * `.kibana-threat-reports` is plugin-owned and hidden, and Kibana feature privileges grant no
 * Elasticsearch privileges on it, so the calling user's client fails for every non-superuser.
 * Update, not upsert: the caller only reaches this after loading the report by this same id, so a
 * missing doc must fail loudly rather than materialize a partial row.
 */
export const writeHuntEvidence = async (
  esClient: ElasticsearchClient,
  { spaceId, reportId, runId, hasConfirmedHit, completeness, totalHits }: WriteHuntEvidenceParams
): Promise<void> => {
  await esClient.update({
    index: HUNT_REPORTS_INDEX,
    id: reportId,
    retry_on_conflict: 3,
    script: {
      lang: 'painless',
      source: EVIDENCE_SCRIPT,
      params: {
        space_id: spaceId,
        last_hunted_at: new Date().toISOString(),
        last_hunt_status: deriveLastHuntStatus({ hasConfirmedHit, completeness }),
        last_hunt_run_id: runId,
        last_hunt_event_hit_count: totalHits,
      },
    },
  });
};
