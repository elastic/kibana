/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  PND_INVESTIGATIONS_URL,
  PND_PROPOSALS_URL,
  buildInvestigationUrl,
} from '@kbn/pnd-common';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  Proposal,
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

/**
 * Fetch ALL proposals across ALL investigations for the Brief queue.
 * The Brief queue shows one row per pending Proposal (ratified queue model,
 * 2026-07-28 design/eng sync), not one row per Investigation.
 */
export const useAllProposals = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['pnd', 'proposals', 'all'],
    queryFn: async (): Promise<ListInvestigationProposalsResponse> =>
      services.http!.get<ListInvestigationProposalsResponse>(PND_PROPOSALS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export interface GenerateProposalProvenance {
  llmDriven: boolean;
  source: string;
  workflowExecutionId: string;
  stepType: string;
  latencyMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface GenerateProposalResponse {
  proposal: Proposal;
  provenance: GenerateProposalProvenance;
}

export const useGenerateProposal = (investigationId: string | undefined) => {
  const { services } = useKibana();

  return useMutation<GenerateProposalResponse, unknown, { connectorId?: string } | void>({
    mutationFn: async (variables): Promise<GenerateProposalResponse> => {
      if (!investigationId) {
        throw new Error('investigation id is required');
      }
      return services.http!.post<GenerateProposalResponse>(
        `${buildInvestigationUrl(investigationId)}/proposals/_generate`,
        {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify(variables ?? {}),
        }
      );
    },
  });
};
