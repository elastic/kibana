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
import { API_VERSIONS, ALERTZERO_PROPOSALS_URL } from '@kbn/alertzero-common';
import type { GetProposalsListResponse } from '../../common/proposals/list';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './use_watches_api';

export const DEFAULT_PROPOSALS_WINDOW_HOURS = 24;

/**
 * Proposals grouped by the category their action declares, plus a `closed`
 * group of decisions made inside the window.
 *
 * Unlike `usePendingProposals` this is sorted `createdAt asc` server-side and
 * does not filter expired proposals — an expired proposal is still visible and
 * its Approve CTA is active (the API will reject it on submission).
 */
export const useProposalsList = (windowHours = DEFAULT_PROPOSALS_WINDOW_HOURS) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.grouped(windowHours),
    queryFn: async (): Promise<GetProposalsListResponse> =>
      services.http!.get<GetProposalsListResponse>(ALERTZERO_PROPOSALS_URL, {
        version: API_VERSIONS.internal.v1,
        query: { windowHours },
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

/**
 * Proposals awaiting a human, already ranked by the API (impact, then
 * confidence and deadline). Superseded ones are dropped, so a retried proposal
 * appears once rather than per attempt.
 *
 * `status: 'pending'` is the whole "awaiting" condition: that status is only
 * ever valid while undecided. `excludeExpired` is still needed alongside it,
 * because it filters on the deadline *date* — between the deadline passing and
 * the gate workflow settling the record as `expired` there is task lag during
 * which it still reads `pending`, and a decision nobody can make any more has
 * no business in the queue.
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
          excludeSuperseded: true,
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
 * Both decision mutations refetch rather than reading the response body: the
 * route only releases the gating workflow, and the decision is written by that
 * workflow's post-gate steps, which run after the resume call has returned.
 *
 * The id therefore comes from the mutation's variables, not from a response
 * body that still describes an undecided proposal. A refetch that beats the
 * post-gate write reads `pending` once more, which is what the `executing`
 * state being added separately is for — nothing here can wait for a write that
 * lands out of band.
 */
const invalidateProposal = (
  queryClient: ReturnType<typeof useQueryClient>,
  { id }: { id: string }
) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(id) });
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
    onSuccess: (_proposal, { id }) => invalidateProposal(queryClient, { id }),
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
    onSuccess: (_proposal, { id }) => invalidateProposal(queryClient, { id }),
  });
};
