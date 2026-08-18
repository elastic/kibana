/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import type { ServiceUserMetadata } from '../../common/service_metadata';

interface MetadataResponse {
  found: boolean;
  metadata: ServiceUserMetadata | null;
}

export const useServiceMetadata = (http: HttpStart, entityId: string | null) => {
  return useQuery<ServiceUserMetadata | null>({
    queryKey: ['service_metadata', entityId],
    enabled: entityId !== null,
    queryFn: async () => {
      if (!entityId) return null;
      const resp = await http.get<MetadataResponse>(
        `/internal/entities_caue/service/${encodeURIComponent(entityId)}/metadata`
      );
      return resp.metadata;
    },
  });
};

export const useSaveServiceMetadata = (http: HttpStart, entityId: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, ServiceUserMetadata>({
    mutationFn: async (metadata) => {
      await http.post(`/internal/entities_caue/service/${encodeURIComponent(entityId)}/metadata`, {
        body: JSON.stringify(metadata),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service_metadata', entityId]);
    },
  });
};
