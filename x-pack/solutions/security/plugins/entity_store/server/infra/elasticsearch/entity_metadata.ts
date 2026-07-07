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
