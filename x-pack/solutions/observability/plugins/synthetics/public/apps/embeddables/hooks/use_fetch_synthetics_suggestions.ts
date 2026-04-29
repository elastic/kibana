/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ClientPluginsStart } from '../../../plugin';

export interface Suggestion {
  label: string;
  value: string;
  count: number;
}

export interface Params {
  fieldName: string;
  filters?: {
    locations?: string[];
    monitor_ids?: string[];
    tags?: string[];
    projects?: string[];
  };
  search: string;
}

type ApiResponse = Record<string, Suggestion[]>;

// Map field names from snake_case (form) to camelCase (API response)
const FIELD_NAME_MAP: Record<string, string> = {
  monitor_ids: 'monitorIds',
  monitor_types: 'monitorTypes',
  tags: 'tags',
  projects: 'projects',
  locations: 'locations',
};

export function useFetchSyntheticsSuggestions({ filters, fieldName, search }: Params) {
  const { http } = useKibana<ClientPluginsStart>().services;
  const { locations, monitor_ids, tags, projects } = filters || {};

  const { loading, data } = useFetcher(async () => {
    return await http.get<ApiResponse>('/internal/synthetics/suggestions', {
      query: {
        locations: locations || [],
        monitorQueryIds: monitor_ids || [],
        tags: tags || [],
        projects: projects || [],
        query: search,
      },
    });
  }, [http, locations, monitor_ids, projects, search, tags]);

  // Map snake_case field name to camelCase API response key
  const apiFieldName = FIELD_NAME_MAP[fieldName] || fieldName;

  return {
    suggestions: data?.[apiFieldName] ?? [],
    isLoading: Boolean(loading),
  };
}
