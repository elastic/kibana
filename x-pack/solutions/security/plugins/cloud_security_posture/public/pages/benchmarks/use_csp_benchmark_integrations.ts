/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { BENCHMARKS_ROUTE_PATH } from '../../../common/constants';
import type { BenchmarksQueryParams } from '../../../common/types/benchmarks/v1';
import { useKibana } from '../../common/hooks/use_kibana';
import type { GetBenchmarkResponse } from '../../../common/types/latest';
import type { GetBenchmarkResponse as GetBenchmarkResponseV1 } from '../../../common/types/benchmarks/v1';

const BENCHMARK_INTEGRATION_QUERY_KEY_V1 = 'csp_benchmark_integrations_v1';

export interface UseCspBenchmarkIntegrationsProps {
  name: string;
  page: number;
  perPage: number;
  sortField: BenchmarksQueryParams['sort_field'];
  sortOrder: BenchmarksQueryParams['sort_order'];
}

export const useCspBenchmarkIntegrationsV1 = ({
  name,
  perPage,
  page,
  sortField,
  sortOrder,
}: UseCspBenchmarkIntegrationsProps) => {
  const { http } = useKibana().services;
  const query: BenchmarksQueryParams = {
    package_policy_name: name,
    per_page: perPage,
    page,
    sort_field: sortField,
    sort_order: sortOrder,
  };

  return useQuery(
    [BENCHMARK_INTEGRATION_QUERY_KEY_V1, query],
    () =>
      http.get<GetBenchmarkResponseV1>(BENCHMARKS_ROUTE_PATH, {
        query,
        version: '1',
      }),
    { keepPreviousData: true }
  );
};

export const BENCHMARK_INTEGRATION_QUERY_KEY_V2 = ['csp_benchmark_integrations_v2'];

export const useCspBenchmarkIntegrationsV2 = () => {
  const { http } = useKibana().services;

  return useQuery(
    BENCHMARK_INTEGRATION_QUERY_KEY_V2,
    () =>
      http.get<GetBenchmarkResponse>(BENCHMARKS_ROUTE_PATH, {
        version: '2',
      }),
    { keepPreviousData: true }
  );
};
