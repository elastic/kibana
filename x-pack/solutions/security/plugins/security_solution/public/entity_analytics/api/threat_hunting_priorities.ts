/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { useKibana } from '../../common/lib/kibana/kibana_react';

export interface ThreatHuntingPrioritySource {
  title: string;
  byline: string;
  description?: string;
  entities?: Array<{
    type: 'user' | 'host';
    idField: string;
    idValue: string;
  }>;
  tags?: string[];
  priority?: number;
  chatRecommendations?: string[];
  chat_recommendations?: string[]; // Elasticsearch field name (snake_case)
  [key: string]: unknown;
}

export interface ThreatHuntingPriority {
  _id: string;
  _source: ThreatHuntingPrioritySource;
}

export interface GetThreatHuntingPrioritiesResponse {
  data: ThreatHuntingPriority[];
  total: number;
  skip: number;
  limit: number;
}

export interface GetThreatHuntingPrioritiesParams {
  skip?: number;
  limit?: number;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
  executionUuid?: string;
  start?: string;
  end?: string;
}

export const useThreatHuntingPrioritiesRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const fetchThreatHuntingPriorities = ({
      signal,
      params,
    }: {
      signal?: AbortSignal;
      params?: GetThreatHuntingPrioritiesParams;
    }) =>
      http.fetch<GetThreatHuntingPrioritiesResponse>('/api/threat_hunting_priorities', {
        version: API_VERSIONS.public.v1,
        method: 'GET',
        query: {
          skip: params?.skip ?? 0,
          limit: params?.limit ?? 20,
          sort_field: params?.sort_field ?? '@timestamp',
          sort_order: params?.sort_order ?? 'desc',
          ...(params?.executionUuid && { executionUuid: params.executionUuid }),
          ...(params?.start && { start: params.start }),
          ...(params?.end && { end: params.end }),
        },
        signal,
      });

    return {
      fetchThreatHuntingPriorities,
    };
  }, [http]);
};

export interface GenerateThreatHuntingPrioritiesParams {
  apiConfig: {
    actionTypeId: string;
    connectorId: string;
    model: string;
  };
  start?: string;
  end?: string;
}

export interface GenerateThreatHuntingPrioritiesResponse {
  data: ThreatHuntingPriority[];
  total: number;
  skip: number;
  limit: number;
}

export const useGenerateThreatHuntingPriorities = () => {
  const http = useKibana().services.http;

  const paramsWithDefaults = useCallback((params: GenerateThreatHuntingPrioritiesParams) => {
    return {
      start: params.start ?? 'now-30d',
      end: params.end ?? 'now',
      apiConfig: params.apiConfig,
    };
  }, []);

  const generateThreatHuntingPriorities = useCallback(
    async ({
      signal,
      params,
    }: {
      signal?: AbortSignal;
      params: GenerateThreatHuntingPrioritiesParams;
    }) => {
      return http.fetch<GenerateThreatHuntingPrioritiesResponse>(
        '/api/threat_hunting_priorities/_generate',
        {
          method: 'POST',
          version: API_VERSIONS.public.v1,
          body: JSON.stringify(params),
          signal,
        }
      );
    },
    [http]
  );

  return {
    generateThreatHuntingPriorities,
  };
};
