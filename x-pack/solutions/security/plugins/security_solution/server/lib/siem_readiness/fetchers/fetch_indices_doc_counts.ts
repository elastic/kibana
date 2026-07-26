/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndexDocCount } from '@kbn/siem-readiness';

export const fetchIndicesDocCounts = async ({
  esClient,
  indices,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
}): Promise<IndexDocCount[]> => {
  return Promise.all(
    indices.map(async (index) => {
      try {
        const { count } = await esClient.count({
          index,
          ignore_unavailable: true,
          allow_no_indices: true,
        });

        return { index, docCount: count ?? 0, exists: true };
      } catch (error: unknown) {
        const esError = error as { meta?: { statusCode?: number }; message?: string };
        return {
          index,
          docCount: 0,
          exists: false,
          error: esError.meta?.statusCode === 404 ? undefined : esError.message,
        };
      }
    })
  );
};
