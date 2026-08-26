/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import type { EntityDefinition, EntityDefinitionAttributes } from '../../common/entity_definition';

interface DefinitionsResponse {
  definitions: EntityDefinition[];
}

interface CreateDefinitionResponse {
  definition: EntityDefinition;
}

export const useDefinitions = (http: HttpStart) =>
  useQuery<EntityDefinition[]>({
    queryKey: ['entities_runtime_caue', 'definitions'],
    queryFn: async () => {
      const resp = await http.get<DefinitionsResponse>(
        '/internal/entities_runtime_caue/definitions'
      );
      return resp.definitions;
    },
    refetchOnWindowFocus: false,
  });

export const useCreateDefinition = (http: HttpStart) => {
  const queryClient = useQueryClient();
  return useMutation<CreateDefinitionResponse, Error, EntityDefinitionAttributes>({
    mutationFn: (attrs) =>
      http.post<CreateDefinitionResponse>('/internal/entities_runtime_caue/definitions', {
        body: JSON.stringify(attrs),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities_runtime_caue', 'definitions']);
    },
  });
};

export const useDeleteDefinition = (http: HttpStart) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      http.delete(`/internal/entities_runtime_caue/definitions/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['entities_runtime_caue', 'definitions']);
      queryClient.invalidateQueries(['entities_runtime_caue', 'entities']);
    },
  });
};
