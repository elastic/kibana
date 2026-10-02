/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';

export interface EngineSettingsPatch {
  confidenceThreshold?: number;
  discoveryPaused?: boolean;
  dailyDiscoveryLimit?: number;
  pausedStreams?: string[];
}
export const useEngineSettings = () => {
  const { significantEventsRepositoryClient: repository } =
    useKibana().dependencies.start.significantEvents;
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['detectionEngineSettings'],
    queryFn: ({ signal }) =>
      repository.fetch('GET /internal/significant_events/engine_settings', {
        signal: signal ?? null,
        params: {},
      }),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const mutation = useMutation({
    mutationFn: (body: EngineSettingsPatch) =>
      repository.fetch('PUT /internal/significant_events/engine_settings', {
        signal: null,
        params: { body },
      }),
    onSuccess: async (data) => {
      cache.setQueryData(['detectionEngineSettings'], data);
      await cache.invalidateQueries({ queryKey: ['detectionEngineActivity'] });
    },
  });
  return { ...query, save: mutation.mutateAsync, isSaving: mutation.isLoading };
};
