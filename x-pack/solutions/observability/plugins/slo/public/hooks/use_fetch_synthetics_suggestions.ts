/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { useKibana } from './use_kibana';

export interface Suggestion {
  label: string;
  value: string;
  count: number;
}

export interface UseFetchSyntheticsSuggestions {
  suggestions: Suggestion[];
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface Params {
  fieldName: string;
  filters?: {
    locations?: string[];
    monitorIds?: string[];
    tags?: string[];
    projects?: string[];
  };
  search: string;
}

type ApiResponse = Record<string, Suggestion[]>;

export function useFetchSyntheticsSuggestions({
  filters,
  fieldName,
  search,
}: Params): UseFetchSyntheticsSuggestions {
  const { http } = useKibana().services;
  const { locations, monitorIds, tags, projects } = filters || {};

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchSyntheticsSuggestions', locations, monitorIds, tags, projects, search],
    queryFn: async ({ signal }) => {
      try {
        const suggestions = await http.get<ApiResponse>('/internal/synthetics/suggestions', {
          query: {
            locations: locations || [],
            monitorQueryIds: monitorIds || [],
            tags: tags || [],
            projects: projects || [],
            query: search,
          },
          signal,
        });

        return suggestions;
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    suggestions: isInitialLoading ? [] : data?.[fieldName] ?? [],
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
