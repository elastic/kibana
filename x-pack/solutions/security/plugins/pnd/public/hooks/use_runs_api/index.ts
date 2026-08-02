/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_RUNS_URL } from '@kbn/pnd-common';
import type { ListRunsResponse } from '@kbn/pnd-common';

import { queryKeys } from '../../query_keys';
import { readAttackDiscoveryWorkflowsEnabled } from '../read_attack_discovery_workflows_enabled';
import { retryOnTransientError } from '../retry_on_transient_error';

/** An empty ledger, for the response body a failed parse leaves undefined. */
const EMPTY_RUNS: ListRunsResponse = { runs: [], total: 0 };

export interface PndRunsQueryResult {
  /**
   * `false` when the response said Attack Discovery 2.0 workflows are off in this
   * space — no orchestrator runs by design rather than a bug — and `undefined`
   * when the server did not say, which is not the same claim as `false`.
   */
  isAttackDiscoveryWorkflowsEnabled?: boolean;
  runs: ListRunsResponse;
}

export interface UseRunsParams {
  /** `size` is bounded 1–200 by the route; omit it to take the route's default. */
  size?: number;
  /** A single orchestrator workflow id; omit it for both watches. */
  watchId?: string;
}

/**
 * `GET /internal/pnd/runs` — the run and trust ledger behind `/watches/activity`.
 *
 * `asResponse: true` for the same reason the proposals queue needs it: an empty
 * `runs` array means "no orchestrator has run here" *or* "Attack Discovery 2.0 is
 * off in this space, so nothing can run", and only the response header tells them
 * apart. A 503 (`workflowsManagement.management` not wired) surfaces as an error,
 * never as an empty ledger.
 *
 * The `watchId` filter is applied **server-side** — it is part of the query
 * contract — so the query key carries it and a filtered read is its own cache
 * entry rather than a client-side slice of an unfiltered one.
 */
export const useRuns = ({
  size,
  watchId,
}: UseRunsParams = {}): UseQueryResult<PndRunsQueryResult> => {
  const { services } = useKibana();

  return useQuery({
    keepPreviousData: true,
    queryKey: queryKeys.runs.list({ size, watchId }),
    queryFn: async (): Promise<PndRunsQueryResult> => {
      const { body, response } = await services.http!.get<ListRunsResponse>(PND_RUNS_URL, {
        asResponse: true,
        // omitted rather than sent as `undefined`, so the route applies its own defaults
        query: {
          ...(size != null ? { size } : {}),
          ...(watchId != null ? { watchId } : {}),
        },
        version: API_VERSIONS.internal.v1,
      });

      return {
        isAttackDiscoveryWorkflowsEnabled: readAttackDiscoveryWorkflowsEnabled(response),
        runs: body ?? EMPTY_RUNS,
      };
    },
    retry: retryOnTransientError,
  });
};
