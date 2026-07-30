/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import { PND_INVESTIGATIONS_INDEX, PND_PROPOSALS_INDEX } from './investigation_index_bootstrap';
// `WatchActivityMetrics` stays declared on the PndStore interface — it is part
// of that contract, not of this collaborator's private surface.
import type { WatchActivityMetrics } from './pnd_store';

/**
 * Real per-watch activity metrics derived from Investigation/Proposal
 * documents — the actual event stream Watches produce.
 *
 * Extracted from the former monolithic `InvestigationStore` (see
 * `investigation_store.ts`'s class doc).
 */
export class WatchMetricsStore {
  constructor(private readonly bootstrap: InvestigationIndexBootstrap) {}

  /**
   * Real per-watch activity metrics derived from Investigation/Proposal
   * documents. Two batched aggs queries (never N+1 per watch):
   *  - `runs7d` + `lastRun`: investigation count/max(createdAt) by `watch_id`
   *    over the last 7 days.
   *  - `acceptedPct`: proposal decision ratio by `sourceWatchId`. "Accepted"
   *    = approved or executed; "decided" excludes `pending` (not yet
   *    decided) and `escalated`/`deferred` (handed off, not accept/reject).
   *    Ratio is null when a watch has zero decided proposals rather than
   *    reporting a misleading 0%.
   *
   * `timeSaved` is intentionally omitted: no field in the Investigation or
   * Proposal schema captures analyst time-per-decision, so there is no
   * honest way to compute it. Watch.metrics.timeSaved stays `null`.
   */
  public async getWatchActivityMetrics(
    esClient: ElasticsearchClient,
    watchIds: string[]
  ): Promise<Record<string, WatchActivityMetrics>> {
    await this.bootstrap.ensureReady(esClient);

    const result: Record<string, WatchActivityMetrics> = {};
    for (const watchId of watchIds) {
      result[watchId] = { runs7d: null, acceptedPct: null, lastRun: null };
    }
    if (watchIds.length === 0) {
      return result;
    }

    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [investigationsAgg, proposalsAgg] = await Promise.all([
      esClient.search({
        index: PND_INVESTIGATIONS_INDEX,
        size: 0,
        query: { terms: { watch_id: watchIds } },
        aggs: {
          by_watch: {
            terms: { field: 'watch_id', size: watchIds.length },
            aggs: {
              last_run: { max: { field: 'createdAt' } },
              runs_7d: { filter: { range: { createdAt: { gte: sevenDaysAgoIso } } } },
            },
          },
        },
      }),
      esClient.search({
        index: PND_PROPOSALS_INDEX,
        size: 0,
        query: { terms: { sourceWatchId: watchIds } },
        aggs: {
          by_watch: {
            terms: { field: 'sourceWatchId', size: watchIds.length },
            aggs: {
              by_status: { terms: { field: 'status', size: 10 } },
            },
          },
        },
      }),
    ]);

    interface WatchBucket {
      key: string;
      last_run: { value_as_string?: string | null };
      runs_7d: { doc_count: number };
    }
    const investigationBuckets =
      (investigationsAgg.aggregations?.by_watch as { buckets?: WatchBucket[] } | undefined)
        ?.buckets ?? [];
    for (const bucket of investigationBuckets) {
      if (!(bucket.key in result)) continue;
      result[bucket.key].runs7d = bucket.runs_7d.doc_count;
      result[bucket.key].lastRun = bucket.last_run.value_as_string ?? null;
    }

    interface StatusBucket {
      key: string;
      doc_count: number;
    }
    interface ProposalWatchBucket {
      key: string;
      by_status: { buckets?: StatusBucket[] };
    }
    const proposalBuckets =
      (proposalsAgg.aggregations?.by_watch as { buckets?: ProposalWatchBucket[] } | undefined)
        ?.buckets ?? [];
    const ACCEPTED_STATUSES = new Set(['approved', 'executed']);
    const REJECTED_STATUSES = new Set(['dismissed']);
    for (const bucket of proposalBuckets) {
      if (!(bucket.key in result)) continue;
      let accepted = 0;
      let decided = 0;
      for (const statusBucket of bucket.by_status.buckets ?? []) {
        if (ACCEPTED_STATUSES.has(statusBucket.key)) {
          accepted += statusBucket.doc_count;
          decided += statusBucket.doc_count;
        } else if (REJECTED_STATUSES.has(statusBucket.key)) {
          decided += statusBucket.doc_count;
        }
      }
      result[bucket.key].acceptedPct = decided > 0 ? Math.round((accepted / decided) * 100) : null;
    }

    return result;
  }
}
