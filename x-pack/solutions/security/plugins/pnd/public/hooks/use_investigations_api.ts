/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_INVESTIGATIONS_URL, buildInvestigationUrl } from '@kbn/pnd-common';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
} from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';

const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

// TODO: update the API schemas as well for renaming investigations to conversations and remove the ListInvestigationsResponse type
export const useInvestigations = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.investigations.list(),
    queryFn: async (): Promise<ListInvestigationsResponse> =>
      services.http!.get<ListInvestigationsResponse>(PND_INVESTIGATIONS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export const useInvestigation = (id: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.investigations.detail(id),
    queryFn: async (): Promise<GetInvestigationResponse> => {
      if (!id) {
        throw new Error('investigation id is required');
      }
      return services.http!.get<GetInvestigationResponse>(buildInvestigationUrl(id), {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: Boolean(id),
    retry: retryOnTransientError,
  });
};

export const useInvestigationProposals = (investigationId: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.investigations.proposals(investigationId),
    queryFn: async (): Promise<ListInvestigationProposalsResponse> => {
      if (!investigationId) {
        throw new Error('investigation id is required');
      }
      return services.http!.get<ListInvestigationProposalsResponse>(
        `${buildInvestigationUrl(investigationId)}/proposals`,
        {
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    enabled: Boolean(investigationId),
    retry: retryOnTransientError,
  });
};
