/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { StatsResponse } from '../types';
import type { MeteringStatsResponse } from './types';

export const fetchSizeStats = async (
  client: IScopedClusterClient,
  isServerless: boolean
): Promise<StatsResponse> => {
  if (isServerless) {
    // This API is only available on Serverless.
    const value = await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
      method: 'GET',
      path: '/_metering/stats',
    });

    const {
      _total: { size_in_bytes: sizeInBytes },
      indices,
    } = value;
    const documentsCountExcludingHiddenIndices = indices
      .filter((index) => !index.name.startsWith('.'))
      .reduce((acc, index) => index.num_docs + acc, 0);

    return {
      sizeStats: {
        size: new ByteSizeValue(sizeInBytes).toString(),
        documents: documentsCountExcludingHiddenIndices,
      },
    };
  } else {
    // Hosted/Self managed
    const { indices: indicesStats } = await client.asCurrentUser.indices.stats({
      expand_wildcards: ['open', 'closed'],
      forbid_closed_indices: false,
      metric: ['docs', 'store'],
    });

    // Filter out system/hidden indices (starting with '.') to count only user-visible data,
    // mirroring the Serverless approach of excluding dot-prefix indices.
    // A new ECH deployment may have system indices with documents, which would otherwise
    // cause hasNoDocuments=false and prevent the Getting Started redirect.
    const userIndices = Object.entries(indicesStats ?? {}).filter(
      ([indexName]) => !indexName.startsWith('.')
    );

    const documents = userIndices.reduce(
      (acc, [, indexStat]) => acc + (indexStat.primaries?.docs?.count ?? 0),
      0
    );

    const sizeInBytes = userIndices.reduce(
      (acc, [, indexStat]) => acc + (indexStat.total?.store?.size_in_bytes ?? 0),
      0
    );

    return {
      sizeStats: {
        size: new ByteSizeValue(sizeInBytes).toString(),
        documents,
      },
    };
  }
};
