/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { NIGHTSHIFT_AUTOMATIONS_QUERY_KEY } from './use_fetch_automations';

export interface UpdateAutomationParams {
  id: string;
  updates: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
  };
}

export const useUpdateAutomation = () => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, UpdateAutomationParams>({
    mutationFn: async ({ id, updates }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('PUT /internal/nightshift/automations/{id}', {
        params: { path: { id }, body: updates },
        signal: null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_AUTOMATIONS_QUERY_KEY });
    },
  });
};
