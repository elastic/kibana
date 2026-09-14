/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpClientError } from '../common/http_error';
import { useKibana } from './use_kibana';

export const SHARED_INVESTIGATIONS_QUERY_KEY = ['nightshift.sharedInvestigations'] as const;

/** Minimal shape of one impacted entity as returned by the shared investigations endpoint. */
export interface SharedImpactedEntity {
  name: string;
  nameText?: string;
  type?: string;
  featureId?: string;
  streamName?: string;
}

/**
 * One investigation returned by GET /internal/investigations/investigations.
 * Mirrors the server-side `Investigation` schema (camelCase) without creating a
 * hard compile-time dependency on the agentic-investigations plugin package.
 */
export interface SharedInvestigation {
  id: string;
  spaceId: string;
  solution: string;
  subjectType: string;
  subjectId: string;
  subjectSummary?: string;
  status: string;
  severity?: string;
  title?: string;
  summary?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  impactedEntities: SharedImpactedEntity[];
}

/** Response envelope from GET /internal/investigations/investigations. */
export interface SharedInvestigationsResponse {
  items: SharedInvestigation[];
  total: number;
  severityCounts: Record<string, number>;
}

export interface FetchSharedInvestigationsParams {
  status?: string;
  severity?: string;
  impactedEntityName?: string;
  page?: number;
  perPage?: number;
}

export interface UseFetchSharedInvestigationsResult {
  investigations: SharedInvestigation[];
  total: number;
  severityCounts: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches investigations from the shared cross-solution endpoint
 * (GET /internal/investigations/investigations) with optional filtering by
 * status, severity, and impacted entity name.
 *
 * Unlike `useFetchInvestigations`, this hook calls the agentic-investigations
 * store rather than the nightshift-specific saved-object store, and therefore
 * returns the camelCase `SharedInvestigation` shape.
 */
export const useFetchSharedInvestigations = ({
  status,
  severity,
  impactedEntityName,
  page = 1,
  perPage = 20,
}: FetchSharedInvestigationsParams = {}): UseFetchSharedInvestigationsResult => {
  const { http } = useKibana().services;

  const { data, isLoading, isError } = useQuery<SharedInvestigationsResponse, Error>({
    queryKey: [
      ...SHARED_INVESTIGATIONS_QUERY_KEY,
      status,
      severity,
      impactedEntityName,
      page,
      perPage,
    ],
    queryFn: async ({ signal }) => {
      const query: Record<string, string | number> = { page, perPage };
      if (status) {
        query.status = status;
      }
      if (severity) {
        query.severity = severity;
      }
      if (impactedEntityName) {
        query.impactedEntityName = impactedEntityName;
      }

      return http.get<SharedInvestigationsResponse>('/internal/investigations/investigations', {
        query,
        signal: signal ?? undefined,
      });
    },
    keepPreviousData: true,
    // 4xx errors are permanent (bad request / authz); only retry network or 5xx failures.
    retry: (failureCount, error) => !isHttpClientError(error) && failureCount < 3,
  });

  return {
    investigations: data?.items ?? [],
    total: data?.total ?? 0,
    severityCounts: data?.severityCounts ?? {},
    isLoading,
    isError,
  };
};
