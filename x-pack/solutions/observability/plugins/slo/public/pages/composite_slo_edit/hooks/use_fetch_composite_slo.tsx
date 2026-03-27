/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { ALL_VALUE, type GetCompositeSLOResponse } from '@kbn/slo-schema';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import type { CreateCompositeSLOForm } from '../types';

interface Response {
  data: CreateCompositeSLOForm | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useFetchCompositeSlo(compositeSloId: string | undefined): Response {
  const { sloClient } = usePluginContext();

  const { isLoading, isError, data } = useQuery({
    queryKey: ['fetchCompositeSlo', compositeSloId],
    queryFn: async ({ signal }) => {
      const response = await sloClient.fetch(
        'GET /api/observability/slo_composites/{id} 2023-10-31',
        { params: { path: { id: compositeSloId! } }, signal }
      );
      return toFormValues(response);
    },
    enabled: Boolean(compositeSloId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, data };
}

function toFormValues(response: GetCompositeSLOResponse): CreateCompositeSLOForm {
  return {
    name: response.name,
    description: response.description,
    members: response.members.map(({ sloId, instanceId, weight }) => ({
      sloId,
      sloName: sloId,
      groupBy: instanceId && instanceId !== ALL_VALUE ? instanceId : ALL_VALUE,
      instanceId: instanceId ?? ALL_VALUE,
      weight,
    })),
    timeWindow: response.timeWindow,
    objective: { target: response.objective.target * 100 },
    tags: response.tags ?? [],
  };
}
