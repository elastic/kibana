/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_PROPOSALS_ACTIVITY_URL } from '@kbn/pnd-common';
import type { GetProposalsActivityResponse } from '@kbn/pnd-common';

import { queryKeys } from '../../query_keys';
import { retryOnTransientError } from '../retry_on_transient_error';

/** What a response with no body is read as — an absent series, not a zeroed one. */
const NO_ACTIVITY: GetProposalsActivityResponse = { buckets: [] };

export interface UseProposalsActivityOptions {
  /** `false` while there is no tile on screen to draw a sparkline under. */
  enabled?: boolean;
}

/**
 * `GET /internal/pnd/proposals/activity` — the 24h hourly series behind the KPI sparklines.
 *
 * **Not the same number as the tile it sits under, and deliberately so.** A tile's headline count is
 * what is still awaiting action, derived from the already-filtered queue with no second query
 * (decision D15). This series is a different metric: gates *opened* per hour over the last 24 hours,
 * unfiltered by watch. Two numbers, two sources, one card.
 *
 * **A failure is left as a failure.** There is no empty-series fallback for a rejected read, because
 * a zero-filled sparkline is an affirmative claim that nothing happened for 24 hours — the same
 * mistake as rendering an absent risk score as a zero. The caller hides the chart and keeps the
 * count. Its own cache key is what makes that safe: a failed series can never disturb the pending
 * decisions the queue drew from `queryKeys.proposals.list()`.
 *
 * The route takes no parameters, so the key is a constant.
 */
export const useProposalsActivity = ({
  enabled = true,
}: UseProposalsActivityOptions = {}): UseQueryResult<GetProposalsActivityResponse> => {
  const { services } = useKibana();

  return useQuery({
    enabled,
    queryFn: async (): Promise<GetProposalsActivityResponse> => {
      const body = await services.http!.get<GetProposalsActivityResponse>(
        PND_PROPOSALS_ACTIVITY_URL,
        { version: API_VERSIONS.internal.v1 }
      );

      return body ?? NO_ACTIVITY;
    },
    queryKey: queryKeys.proposals.activity(),
    retry: retryOnTransientError,
  });
};
