/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';

export interface Suggestion {
  label: string;
  value: string;
  count: number;
}

export interface UseFetchSyntheticsSuggestions {
  suggestions: Suggestion[];
  isLoading: boolean;
  allSuggestions?: Record<string, Suggestion[]>;
}

export interface Params {
  fieldName?: string;
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
  const { http } = useKibana<ClientPluginsStart>().services;
  const { locations, monitorIds, tags, projects } = filters || {};

  const { loading, data } = useFetcher(
    async ({ signal }) => {
      return await http.get<ApiResponse>('/internal/synthetics/suggestions', {
        query: {
          locations: locations || [],
          monitorQueryIds: monitorIds || [],
          tags: tags || [],
          projects: projects || [],
          query: search,
        },
        signal,
      });
    },
    [http, locations, monitorIds, tags, projects, search]
  );

  return {
    suggestions: fieldName ? data?.[fieldName] ?? [] : [],
    allSuggestions: data,
    isLoading: Boolean(loading),
  };
}
