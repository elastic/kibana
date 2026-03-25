/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { CreateCompositeSLOForm } from '../types';

interface Response {
  data: CreateCompositeSLOForm | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useFetchCompositeSlo(compositeSloId: string | undefined): Response {
  const { isLoading, isError, data } = useQuery({
    queryKey: ['fetchCompositeSlo', compositeSloId],
    queryFn: async () => {
      // TODO: replace with real GET /api/observability/slos/composite/{id} once backend is implemented
      return {
        name: 'Mock composite SLO',
        description: '',
        members: [{ sloId: 'mock-slo-id', sloName: 'Mock SLO', instanceId: ALL_VALUE, weight: 1 }],
        timeWindow: { duration: '30d' as const, type: 'rolling' as const },
        objective: { target: 99 },
        tags: [],
      } satisfies CreateCompositeSLOForm;
    },
    enabled: Boolean(compositeSloId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, data };
}
