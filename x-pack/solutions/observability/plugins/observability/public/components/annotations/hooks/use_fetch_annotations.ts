/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { Annotation } from '../../../../common/annotations';
import { useKibana } from '../../../utils/kibana_react';

export interface FindAnnotationsResponse {
  items: Annotation[];
  total: number;
}

export function useFetchAnnotations({
  start,
  end,
  slo,
}: {
  start: string;
  end: string;
  slo?: SLOWithSummaryResponse;
}) {
  const { http } = useKibana().services;

  const sloId = slo?.id;
  const sloInstanceId = slo?.instanceId;
  let serviceName: string | undefined;
  if (slo?.indicator.params && 'service' in slo?.indicator.params) {
    serviceName = slo?.indicator.params.service;
  }

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchAnnotationList', start, end, sloId, sloInstanceId, serviceName],
    queryFn: async ({}) => {
      return await http.get<FindAnnotationsResponse>('/api/observability/annotation/find', {
        query: {
          start,
          end,
          serviceName,
          sloId,
          sloInstanceId,
        },
      });
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
    refetch,
  };
}
