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
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  FindSLOParams,
  FindSLOResponse,
  GetSLOGroupedStatsParams,
  GetSLOGroupedStatsResponse,
} from '@kbn/slo-schema';
import { once } from 'lodash';
import { FindSLO } from '../services/find_slo';
import { GetSLOGroupedStats } from '../services/get_slo_grouped_stats';
import { DefaultSLODefinitionRepository } from '../services/slo_definition_repository';
import { DefaultSLOSettingsRepository } from '../services/slo_settings_repository';
import { DefaultSummarySearchClient } from '../services/summary_search_client/summary_search_client';
import { getSummaryIndices } from '../services/utils/get_summary_indices';

export interface SloClient {
  getSummaryIndices(): Promise<string[]>;
  getGroupedStats(params: GetSLOGroupedStatsParams): Promise<GetSLOGroupedStatsResponse>;
  findSlos(params: FindSLOParams): Promise<FindSLOResponse>;
}

export function getSloClientWithRequest({
  esClient,
  scopedClusterClient,
  soClient,
  spaceId,
  logger,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  spaceId: string;
  logger: Logger;
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

    findSlos: async (params: FindSLOParams) => {
      const settings = await settingsRepository.get();
      const repository = new DefaultSLODefinitionRepository(soClient, logger);
      const summarySearchClient = new DefaultSummarySearchClient(
        scopedClusterClient,
        logger,
        spaceId,
        settings
      );
      const findSLO = new FindSLO(repository, summarySearchClient);
      return await findSLO.execute(params);
    },
  };
}
