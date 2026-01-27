/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchClient,
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { GetSLOGroupedStatsParams, GetSLOGroupedStatsResponse } from '@kbn/slo-schema';
import { once } from 'lodash';
import { GetSLOGroupedStats } from '../services/get_slo_grouped_stats';
import { DefaultSLOSettingsRepository } from '../services/slo_settings_repository';
import { getSummaryIndices } from '../services/utils/get_summary_indices';

export interface SloClient {
  getSummaryIndices(): Promise<string[]>;
  getGroupedStats(params: GetSLOGroupedStatsParams): Promise<GetSLOGroupedStatsResponse>;
}

export function getSloClientWithRequest({
  esClient,
  scopedClusterClient,
  soClient,
  spaceId,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  spaceId: string;
}): SloClient {
  const settingsRepository = new DefaultSLOSettingsRepository(soClient);

  const getSummaryIndicesOnce = once(async () => {
    const settings = await settingsRepository.get();
    const { indices } = await getSummaryIndices(esClient, settings);

    return indices;
  });

  return {
    getSummaryIndices: async () => {
      return await getSummaryIndicesOnce();
    },

    getGroupedStats: async (params: GetSLOGroupedStatsParams) => {
      const settings = await settingsRepository.get();
      const service = new GetSLOGroupedStats(scopedClusterClient, spaceId, settings);
      return await service.execute(params);
    },
  };
}
