/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';

interface MetadataResponse {
  metadata: Record<string, string>;
}

const metadataUrl = (definitionId: string, entityId: string) =>
  `/internal/entities_runtime_caue/definitions/${encodeURIComponent(
    definitionId
  )}/entities/${encodeURIComponent(entityId)}/metadata`;

export const useEntityMetadata = (http: HttpStart, definitionId: string, entityId: string) =>
  useQuery<Record<string, string>>({
    queryKey: ['entities_runtime_caue', 'entity_metadata', definitionId, entityId],
    queryFn: async () => {
      const resp = await http.get<MetadataResponse>(metadataUrl(definitionId, entityId));
      return resp.metadata;
    },
    refetchOnWindowFocus: false,
  });

export const useSaveEntityMetadata = (http: HttpStart, definitionId: string, entityId: string) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, Array<{ key: string; value: string }>>({
    mutationFn: (metadata) =>
      http.post(metadataUrl(definitionId, entityId), {
        body: JSON.stringify({ metadata }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries([
        'entities_runtime_caue',
        'entity_metadata',
        definitionId,
        entityId,
      ]);
    },
  });
};
