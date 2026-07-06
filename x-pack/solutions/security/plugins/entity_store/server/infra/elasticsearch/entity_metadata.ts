/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { BulkDropAggregator } from './bulk_drop_aggregator';
import type { BulkDropTypeSummary } from './bulk_drop_aggregator';

export interface BulkCreateEntityMetadataDocsResult {
  /** Number of docs successfully appended. */
  successful: number;
  /** Number of docs dropped after exhausting the helper's retries. */
  failed: number;
  /** Dropped docs grouped by ES error type, sorted by frequency. Empty when nothing was dropped. */
  dropsByType: BulkDropTypeSummary[];
}

/**
 * Append documents to the entity metadata datastream. The datastream is
 * append-only, so the bulk op is `create` rather than `update`. The caller
 * owns the doc shape — this primitive is event-action agnostic so future
 * metadata kinds (behaviors, anomalies, alerts) can reuse it without
 * needing a new write path.
 *
 * Uses `esClient.helpers.bulk` (matching `ingestEntities`) rather than a
 * hand-rolled `esClient.bulk`: the helper streams from the datasource instead
 * of materializing the whole `operations` array, chunks by `flushBytes` so a
 * high-fan-out run can't exceed `http.max_content_length`, and retries 429s.
 * Per-doc drops are surfaced via `onDrop`; this function only aggregates them
 * by error type — it does not log. A systemic failure (missing privileges, a
 * read-only index) rejects every doc in the batch, so logging per drop here
 * would flood the log with identical lines. The call resolves to
 * `{ successful, failed, dropsByType }`; callers own logging a single
 * summary line with whatever domain context they have.
 *
 */
export const bulkCreateEntityMetadataDocs = async <TDoc extends object>(
  esClient: ElasticsearchClient,
  params: {
    index: string;
    docs: TDoc[];
  }
): Promise<BulkCreateEntityMetadataDocsResult> => {
  const dropAggregator = new BulkDropAggregator();

  const { successful, failed } = await esClient.helpers.bulk({
    datasource: params.docs,
    index: params.index,
    refresh: false,
    onDocument: () => ({ create: {} }),
    onDrop: (dropped) => {
      dropAggregator.record(dropped);
    },
  });

  return { successful, failed, dropsByType: dropAggregator.summary() };
};

/**
 * Read the most recent metadata doc for a given entity and event action.
 *
 * The metadata datastream is append-only, so multiple docs of the same
 * `event.action` can exist for one `entity.id` (e.g. one per AI-summary
 * generation). This returns the latest by `@timestamp` ("latest wins"),
 * which is what single-entity views (the flyout) need.
 *
 * Two failure modes are handled differently, on purpose:
 *   - Missing datastream (nothing written in this space yet): tolerated, returns `null`.
 *   - No read privilege: NOT tolerated, the error propagates so a gated caller
 *     (reading as the current user) can tell "no access" apart from "no data".
 *
 * This is why we do NOT set `ignore_unavailable` / `allow_no_indices`. With those
 * on, Elasticsearch treats an index the caller can't read as just "unavailable",
 * skips it, and returns an empty 200 instead of a 403 — hiding the authorization
 * failure and making it look identical to "no data".
 */
export const getLatestEntityMetadataDoc = async <TDoc>(
  esClient: ElasticsearchClient,
  params: {
    index: string;
    entityId: string;
    eventAction: string;
  }
): Promise<TDoc | null> => {
  try {
    const response = await esClient.search<TDoc>({
      index: params.index,
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            { term: { 'event.action': params.eventAction } },
            { term: { 'entity.id': params.entityId } },
          ],
        },
      },
    });

    return response.hits.hits[0]?._source ?? null;
  } catch (error) {
    // Datastream not created yet (no docs written in this space) → no summary.
    // A 403 (no metadata read privilege) still propagates to the caller.
    if (error?.meta?.statusCode === 404 || error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
};
