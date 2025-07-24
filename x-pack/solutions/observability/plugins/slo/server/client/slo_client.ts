/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { once } from 'lodash';
import { GetSLOParams } from '@kbn/slo-schema';
import { GetScopedClients } from '../routes/types';
import { getSloSettings, getSummaryIndices } from '../services/slo_settings';
import { SLOClient } from './types';
import { DefaultBurnRatesClient, DefaultSummaryClient, GetSLO } from '../services';
import { SloDefinitionClient } from '../services/slo_definition_client';

export async function sloClientFactory({
  request,
  getScopedClients,
  logger,
}: {
  request: KibanaRequest;
  getScopedClients: GetScopedClients;
  logger: Logger;
}): Promise<SLOClient> {
  const { scopedClusterClient, spaceId, soClient, repository } = await getScopedClients(request);

  const getSummaryIndicesOnce = once(async () => {
    const settings = await getSloSettings(soClient);
    const { indices } = await getSummaryIndices(scopedClusterClient.asInternalUser, settings);
    return indices;
  });

  return {
    getSummaryIndices: async () => {
      return await getSummaryIndicesOnce();
    },
    getSlo: async (id: string, params: GetSLOParams) => {
      const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
      const summaryClient = new DefaultSummaryClient(
        scopedClusterClient.asCurrentUser,
        burnRatesClient
      );
      const definitionClient = new SloDefinitionClient(
        repository,
        scopedClusterClient.asCurrentUser,
        logger
      );
      const getSLO = new GetSLO(definitionClient, summaryClient);

      return getSLO.execute(id, spaceId, params);
    },
  };
}
