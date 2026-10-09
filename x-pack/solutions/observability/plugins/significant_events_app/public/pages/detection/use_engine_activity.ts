/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';

export const useEngineActivity = ({ live = false }: { live?: boolean } = {}) => {
  const { significantEventsRepositoryClient: repository } =
    useKibana().dependencies.start.significantEvents;
  const queryClient = useQueryClient();
  const previousRuns = useRef<Map<string, string>>();
  const query = useQuery({
    queryKey: ['detectionEngineActivity'],
    queryFn: ({ signal }) =>
      repository.fetch('GET /internal/significant_events/engine_activity', {
        signal: signal ?? null,
        params: {},
      }),
    refetchInterval: live ? 1000 : false,
    staleTime: 750,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!query.data) return;
    const previous = previousRuns.current;
    const changed = previous && query.data.runs.some((run) => previous.get(run.id) !== run.status);
    previousRuns.current = new Map(query.data.runs.map((run) => [run.id, run.status]));
    if (changed)
      void queryClient.invalidateQueries(
        { queryKey: ['detectionWorkspace'] },
        { cancelRefetch: false }
      );
  }, [query.data, queryClient]);
  return query;
};
export type EngineActivity = NonNullable<ReturnType<typeof useEngineActivity>['data']>;
export type EngineRun = EngineActivity['runs'][number];
