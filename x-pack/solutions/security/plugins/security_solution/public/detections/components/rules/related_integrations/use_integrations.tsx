/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { Integration } from '../../../../../common/api/detection_engine/fleet_integrations';
import { fleetIntegrationsApi } from '../../../../detection_engine/fleet_integrations';

const ONE_MINUTE = 60000;

export interface UseIntegrationsArgs {
  skip?: boolean;
}

export const useIntegrations = ({ skip = false }: UseIntegrationsArgs = {}) => {
  return useQuery<Integration[]>(
    ['integrations'],
    async ({ signal }) => {
      const response = await fleetIntegrationsApi.fetchAllIntegrations({
        signal,
      });

      return response.integrations ?? [];
    },
    {
      keepPreviousData: true,
      staleTime: ONE_MINUTE * 5,
      enabled: !skip,
    }
  );
};
