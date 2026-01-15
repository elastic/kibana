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
    const {
      _total: { size_in_bytes: sizeInBytes, num_docs: numDocs },
    } = await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
      method: 'GET',
      path: '/_metering/stats',
    });

    return {
      sizeStats: {
        size: new ByteSizeValue(sizeInBytes).toString(),
        documents: numDocs,
      },
    };
  } else {
    // Hosted/Self managed
    const { _all: stats } = await client.asCurrentUser.indices.stats({
      expand_wildcards: ['hidden', 'all'],
      forbid_closed_indices: false,
      metric: ['docs', 'store'],
    });

    return {
      sizeStats: {
        size: new ByteSizeValue(stats.total?.store?.size_in_bytes ?? 0).toString(),
        documents: stats?.primaries?.docs?.count ?? 0,
      },
    };
  }
};
