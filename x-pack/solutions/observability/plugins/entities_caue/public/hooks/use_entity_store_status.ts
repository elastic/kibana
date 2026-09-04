/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';

const BASE = '/api/security/entity_store';
const VERSION = '2023-10-31';

type EntityStoreStatus = 'not_installed' | 'installing' | 'running' | 'stopped' | 'error';

interface StatusResponse {
  status: EntityStoreStatus;
}

const fetchStatus = (http: HttpStart): Promise<StatusResponse> =>
  http.get<StatusResponse>(`${BASE}/status`, {
    headers: { 'elastic-api-version': VERSION },
  });

export const useEntityStoreStatus = (http: HttpStart) => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries(['entitiesCaue', 'entityStoreStatus']);

  const statusQuery = useQuery({
    queryKey: ['entitiesCaue', 'entityStoreStatus'],
    queryFn: () => fetchStatus(http),
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const { status } = await fetchStatus(http);
      if (status === 'not_installed') {
        return http.post(`${BASE}/install`, {
          headers: { 'elastic-api-version': VERSION },
          body: JSON.stringify({ entityTypes: ['service'] }),
        });
      }
      return http.put(`${BASE}/start`, {
        headers: { 'elastic-api-version': VERSION },
        body: JSON.stringify({ entityTypes: ['service'] }),
      });
    },
    onSuccess: invalidate,
  });

  const stopMutation = useMutation({
    mutationFn: () =>
      http.post(`${BASE}/stop`, {
        headers: { 'elastic-api-version': VERSION },
        body: JSON.stringify({ entityTypes: ['service'] }),
      }),
    onSuccess: invalidate,
  });

  return { statusQuery, startMutation, stopMutation };
};
