/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../plugin';

export interface Suggestion {
  label: string;
  value: string;
  count: number;
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

export function useFetchSyntheticsSuggestions({ filters, fieldName, search }: Params) {
  const { http } = useKibana<ClientPluginsStart>().services;
  const { locations, monitorIds, tags, projects } = filters || {};

  const { loading, data } = useFetcher(async () => {
    return await http.get<ApiResponse>('/internal/synthetics/suggestions', {
      query: {
        locations: locations || [],
        monitorQueryIds: monitorIds || [],
        tags: tags || [],
        projects: projects || [],
        query: search,
      },
    });
  }, [http, locations, monitorIds, projects, search, tags]);

  return {
    suggestions: data?.[fieldName] ?? [],
    isLoading: Boolean(loading),
  };
}
