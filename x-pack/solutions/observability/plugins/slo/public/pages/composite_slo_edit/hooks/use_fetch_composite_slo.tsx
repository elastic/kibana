/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { ALL_VALUE, type GetCompositeSLOResponse, type GetSLOResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../hooks/use_kibana';
import type { CreateCompositeSLOForm } from '../types';

interface Response {
  data: CreateCompositeSLOForm | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useFetchCompositeSlo(compositeSloId: string | undefined): Response {
  const { http } = useKibana().services;

  const { isLoading, isError, data } = useQuery({
    queryKey: ['fetchCompositeSlo', compositeSloId],
    queryFn: async ({ signal }) => {
      const response = await http.get<GetCompositeSLOResponse>(
        `/api/observability/slo_composites/${encodeURIComponent(compositeSloId!)}`,
        { signal }
      );

      const uniqueSloIds = [...new Set(response.members.map((m) => m.sloId))];
      const definitions = await Promise.all(
        uniqueSloIds.map((id) =>
          http
            .get<GetSLOResponse>(`/api/observability/slos/${encodeURIComponent(id)}`, { signal })
            .catch(() => null)
        )
      );

      const defMap = new Map(
        definitions.flatMap((d) => (d ? [[d.id, { name: d.name, groupBy: d.groupBy }]] : []))
      );

      return toFormValues(response, defMap);
    },
    enabled: Boolean(compositeSloId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, data };
}

function toFormValues(
  response: GetCompositeSLOResponse,
  defMap: Map<string, { name: string; groupBy: string | string[] }>
): CreateCompositeSLOForm {
  return {
    name: response.name,
    description: response.description,
    members: response.members.map(({ sloId, instanceId, weight }) => {
      const def = defMap.get(sloId);
      const groupBy = def?.groupBy ?? ALL_VALUE;
      return {
        sloId,
        sloName: def?.name ?? sloId,
        groupBy,
        instanceId: instanceId ?? ALL_VALUE,
        weight,
      };
    }),
    timeWindow: response.timeWindow,
    objective: { target: response.objective.target * 100 },
    tags: response.tags ?? [],
  };
}
