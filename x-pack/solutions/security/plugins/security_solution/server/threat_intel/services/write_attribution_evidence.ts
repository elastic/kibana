/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Scripted per-space upsert into the nested `evidence` array. Update API (not Bulk): Bulk rejects
 * scripts on indices with `semantic_text`. Sets only `alert_hits` / `alert_hits_total` on the
 * matched (or newly appended) element, never the whole element: `evidence` is shared with Hunt
 * Watch's writer, which sets a disjoint set of keys (`last_hunt_*`, `corroborated_rank_score`) on
 * the same per-space element. A blind replace here would erase that space's hunt fields whenever
 * this task runs after it.
 */
const EVIDENCE_SCRIPT = `
if (!(ctx._source.evidence instanceof List)) { ctx._source.evidence = new ArrayList(); }
boolean found = false;
for (int i = 0; i < ctx._source.evidence.size(); i++) {
  if (ctx._source.evidence[i].space_id == params.space_id) {
    ctx._source.evidence[i].alert_hits = ['window': params.window, 'computed_at': params.computed_at, 'ioc_match_hits': params.ioc_match_hits, 'technique_overlap_hits': params.technique_overlap_hits];
    ctx._source.evidence[i].alert_hits_total = params.alert_hits_total;
    found = true;
  }
}
if (!found) {
  Map el = new HashMap();
  el.space_id = params.space_id;
  el.alert_hits = ['window': params.window, 'computed_at': params.computed_at, 'ioc_match_hits': params.ioc_match_hits, 'technique_overlap_hits': params.technique_overlap_hits];
  el.alert_hits_total = params.alert_hits_total;
  ctx._source.evidence.add(el);
}
`.trim();

export interface WriteAttributionEvidenceParams {
  index: string;
  id: string;
  spaceId: string;
  window: string;
  computedAt: string;
  iocMatchHits: number;
  techniqueOverlapHits: number;
  alertHitsTotal: number;
}

/**
 * Stamps a report's alert-attribution counts for the calling space. Internal user:
 * `.kibana-threat-reports` is plugin-owned and hidden, and Kibana feature privileges grant no
 * Elasticsearch privileges on it, so the calling user's client fails for every non-superuser.
 * Update, not upsert: the caller only reaches this after loading the report by this same id and
 * index, so a missing doc must fail loudly rather than materialize a partial row.
 */
export const writeAttributionEvidence = async (
  esClient: ElasticsearchClient,
  {
    index,
    id,
    spaceId,
    window,
    computedAt,
    iocMatchHits,
    techniqueOverlapHits,
    alertHitsTotal,
  }: WriteAttributionEvidenceParams
): Promise<void> => {
  await esClient.update({
    index,
    id,
    retry_on_conflict: 3,
    script: {
      lang: 'painless',
      source: EVIDENCE_SCRIPT,
      params: {
        space_id: spaceId,
        window,
        computed_at: computedAt,
        ioc_match_hits: iocMatchHits,
        technique_overlap_hits: techniqueOverlapHits,
        alert_hits_total: alertHitsTotal,
      },
    },
  });
};
