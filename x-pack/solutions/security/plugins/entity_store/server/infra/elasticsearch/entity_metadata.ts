/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * Append documents to the entity metadata datastream. The datastream is
 * append-only, so the bulk op is `create` rather than `update`. The caller
 * owns the doc shape — this primitive is event-action agnostic so future
 * metadata kinds (behaviors, anomalies, alerts) can reuse it without
 * needing a new write path.
 *
 * `refresh` defaults to `false`: this is an append-only history stream
 * written by background maintainers and read asynchronously, so blocking
 * each bulk on a shard refresh only adds latency to maintainer runs. Callers
 * that need read-your-write (e.g. tests) can opt into `'wait_for'`.
 */
export const bulkCreateEntityMetadataDocs = <TDoc extends object>(
  esClient: ElasticsearchClient,
  params: {
    index: string;
    docs: TDoc[];
    refresh?: 'wait_for' | boolean;
  }
): Promise<BulkResponse> => {
  const operations: Array<BulkOperationContainer | TDoc> = [];
  for (const doc of params.docs) {
    operations.push({ create: {} }, doc);
  }
  return esClient.bulk({
    index: params.index,
    operations,
    refresh: params.refresh ?? false,
  });
};
