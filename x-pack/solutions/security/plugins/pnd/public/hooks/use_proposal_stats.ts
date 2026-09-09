/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  PROPOSAL_STATS_URL,
} from '@kbn/agentic-investigations-plugin/common';
import type { ProposalStatsResponse } from '@kbn/agentic-investigations-plugin/common';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './use_watches_api';

const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_BUCKET_MINUTES = 30;

/**
 * Open-proposal counts bucketed over the last `windowHours` hours, suitable
 * for driving sparkline charts. Each bucket carries a `counts` map keyed by
 * proposal category. The hook re-fetches on window focus (via the global
 * QueryClient `staleTime: 30_000` + `refetchOnWindowFocus: 'always'` default).
 */
export const useProposalStats = ({
  windowHours = DEFAULT_WINDOW_HOURS,
  bucketMinutes = DEFAULT_BUCKET_MINUTES,
}: { windowHours?: number; bucketMinutes?: number } = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.stats(windowHours),
    queryFn: (): Promise<ProposalStatsResponse> =>
      services.http!.get<ProposalStatsResponse>(PROPOSAL_STATS_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: { windowHours, bucketMinutes },
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};
