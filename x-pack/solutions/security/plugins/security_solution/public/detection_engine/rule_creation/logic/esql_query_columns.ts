/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FetchQueryOptions,
  QueryClient,
  QueryFunction,
  QueryKey,
} from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { KibanaServices } from '../../../common/lib/kibana';

const DEFAULT_STALE_TIME = 60 * 1000;

interface FetchEsqlQueryColumnsParams {
  esqlQuery: string;
  queryClient: QueryClient;
}

export async function fetchEsqlQueryColumns({
  esqlQuery,
  queryClient,
}: FetchEsqlQueryColumnsParams): Promise<DatatableColumn[]> {
  const data = await queryClient.fetchQuery(createSharedTanstackQueryOptions(esqlQuery));

  if (data instanceof Error) {
    throw data;
  }

  return data;
}

interface UseEsqlQueryColumnsResult {
  columns: DatatableColumn[];
  isLoading: boolean;
}

export function useEsqlQueryColumns(esqlQuery: string): UseEsqlQueryColumnsResult {
  const { data, isLoading } = useQuery({
    ...createSharedTanstackQueryOptions(esqlQuery),
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { columns: !data || data instanceof Error ? [] : data, isLoading };
}

function createSharedTanstackQueryOptions(
  esqlQuery: string
): FetchQueryOptions<DatatableColumn[] | Error> {
  return {
    queryKey: [esqlQuery.trim()],
    queryFn: queryEsqlColumnsFactory(esqlQuery),
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}

function queryEsqlColumnsFactory(
  esqlQuery: string
): QueryFunction<DatatableColumn[] | Error, QueryKey> {
  return async ({ signal }) => {
    if (esqlQuery.trim() === '') {
      return [];
    }

    try {
      return await getESQLQueryColumns({
        esqlQuery,
        search: KibanaServices.get().data.search.search,
        signal,
      });
    } catch (e) {
      return e;
    }
  };
}
