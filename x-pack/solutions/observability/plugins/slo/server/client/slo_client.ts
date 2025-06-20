/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import { once } from 'lodash';
import { GetScopedClients } from '../routes/types';
import { getSloSettings, getSummaryIndices } from '../services/slo_settings';
import { SLOClient } from './types';

export async function sloClientFactory({
  request,
  getScopedClients,
}: {
  request: KibanaRequest;
  getScopedClients: GetScopedClients;
}): Promise<SLOClient> {
  const { scopedClusterClient, soClient } = await getScopedClients(request);

  const getSummaryIndicesOnce = once(async () => {
    const settings = await getSloSettings(soClient);
    const { indices } = await getSummaryIndices(scopedClusterClient.asInternalUser, settings);
    return indices;
  });

  return {
    getSummaryIndices: async () => {
      return await getSummaryIndicesOnce();
    },
  };
}
