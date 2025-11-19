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
import { once } from 'lodash';
import type { FindSLOParams, FindSLOResponse } from '@kbn/slo-schema';
import { FindSLO } from '../services';
import { DefaultSummarySearchClient } from '../services/summary_search_client/summary_search_client';
import { KibanaSavedObjectsSLORepository } from '../services/slo_repository';
import { getSloSettings, getSummaryIndices } from '../services/slo_settings';

export interface SloClient {
  getSummaryIndices(): Promise<string[]>;
  findSLOs(params: FindSLOParams): Promise<FindSLOResponse>;
}

export function getSloClientWithRequest({
  request,
  esClient,
  soClient,
  scopedClusterClient,
  logger,
  spaceId,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
  spaceId: string;
}): SloClient {
  const getSummaryIndicesOnce = once(async () => {
    const settings = await getSloSettings(soClient);

    const { indices } = await getSummaryIndices(esClient, settings);

    return indices;
  });

  // Create repository and summary search client instances
  const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
  const summarySearchClient = new DefaultSummarySearchClient(
    scopedClusterClient,
    soClient,
    logger,
    spaceId
  );
  const findSLO = new FindSLO(repository, summarySearchClient);

  return {
    getSummaryIndices: async () => {
      return await getSummaryIndicesOnce();
    },
    findSLOs: async (params: FindSLOParams) => {
      return await findSLO.execute(params);
    },
  };
}
