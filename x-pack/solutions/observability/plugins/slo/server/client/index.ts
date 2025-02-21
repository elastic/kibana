/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { once } from 'lodash';
import { getSloSettings, getSummaryIndices } from '../services/slo_settings';

export interface SloClient {
  getSummaryIndices(): Promise<string[]>;
}

export function getSloClientWithRequest({
  esClient,
  soClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}): SloClient {
  const getSummaryIndicesOnce = once(async () => {
    const settings = await getSloSettings(soClient);

    const { indices } = await getSummaryIndices(esClient, settings);

    return indices;
  });

  return {
    getSummaryIndices: async () => {
      return await getSummaryIndicesOnce();
    },
  };
}
