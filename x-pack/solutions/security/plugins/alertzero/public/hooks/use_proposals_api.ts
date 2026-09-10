/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
} from '@kbn/agentic-investigations-plugin/common';
import type {
  ApproveProposalRequest,
  DismissProposalRequest,
  ListProposalsResponse,
  Proposal,
  ProposalWithMetadata,
} from '@kbn/agentic-investigations-plugin/common';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './use_watches_api';

/**
 * Pending proposals, already grouped and ranked by the API (category, then
 * impact, confidence and deadline). Expired ones are dropped: a deadline that
 * has passed is no longer a decision anyone can make.
 */
export const usePendingProposals = (conversationId?: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.list(conversationId),
    queryFn: async (): Promise<ListProposalsResponse> =>
      services.http!.get<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: {
          status: 'pending',
          excludeExpired: true,
          ...(conversationId ? { conversationId } : {}),
        },
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export const useProposal = (id: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.detail(id),
    queryFn: async (): Promise<ProposalWithMetadata> => {
      if (!id) {
        throw new Error('proposal id is required');
      }
      return services.http!.get<ProposalWithMetadata>(`${PROPOSALS_INTERNAL_URL}/${id}`, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
      });
    },
    enabled: Boolean(id),
    retry: retryOnTransientError,
  });
};

/**
 * Approving submits the action input the analyst was shown, so the API can
 * refuse an approval that no longer matches the record.
 */
export const useApproveProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ApproveProposalRequest }): Promise<Proposal> =>
      services.http!.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${id}/approve`, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.proposals.detail(proposal.id),
      });
    },
  });
};

export const useDismissProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DismissProposalRequest }): Promise<Proposal> =>
      services.http!.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${id}/dismiss`, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.proposals.detail(proposal.id),
      });
    },
  });
};
