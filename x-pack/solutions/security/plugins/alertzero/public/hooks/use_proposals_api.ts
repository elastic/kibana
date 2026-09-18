/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, ALERTZERO_PROPOSALS_URL } from '@kbn/alertzero-common';
import { retryOnTransientError } from '@kbn/agentic-investigations-plugin/public';
import type { GetProposalsListResponse } from '../../common/proposals/list';
import { queryKeys } from '../query_keys';

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
