/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  ALERTZERO_PROPOSALS_CATEGORY_URL,
  ALERTZERO_PROPOSALS_CLOSED_URL,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from '@kbn/agentic-investigations-plugin/public';
import type { ProposalsPageResponse } from '../../common/proposals/list';
import { queryKeys } from '../query_keys';

/** Pending proposals for a single action category, newest first. */
export const useProposalsByCategory = (
  category: string,
  params: { size?: number; from?: number } = {}
) => {
  const { services } = useKibana();
  const path = ALERTZERO_PROPOSALS_CATEGORY_URL.replace('{category}', encodeURIComponent(category));

  return useQuery({
    queryKey: queryKeys.proposals.byCategory(category),
    queryFn: async (): Promise<ProposalsPageResponse> =>
      services.http!.get<ProposalsPageResponse>(path, {
        version: API_VERSIONS.internal.v1,
        query: params,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

/** Proposals decided in the last 72 h, sorted newest first. */
export const useClosedProposals = (params: { size?: number; from?: number } = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.closed(),
    queryFn: async (): Promise<ProposalsPageResponse> =>
      services.http!.get<ProposalsPageResponse>(ALERTZERO_PROPOSALS_CLOSED_URL, {
        version: API_VERSIONS.internal.v1,
        query: params,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};
