/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SyntheticsRestApiRouteFactory } from '../types';
import type { IndexSizeEntry } from '../../../common/constants';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getIndexSizesRoute: SyntheticsRestApiRouteFactory<{
  data: IndexSizeEntry[];
}> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.INDEX_SIZE,
  validate: {},
  handler: async ({ syntheticsEsClient, server }) => {
    const stats = await syntheticsEsClient.baseESClient.indices.stats({
      index: 'synthetics-*',
      metric: 'store',
    });

    const data: IndexSizeEntry[] = Object.entries(stats.indices ?? {}).map(
      ([indexName, indexStats]) => ({
        index: indexName,
        sizeInBytes: indexStats.total?.store?.size_in_bytes ?? 0,
      })
    );

    return { data };
  },
});
