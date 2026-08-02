/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, buildExecutionUrl } from '@kbn/pnd-common';
import type { GetExecutionResponse } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../common/constants';
import { queryKeys } from '../../query_keys';
import { readPndSignalHeader } from '../read_pnd_signal_header';
import { retryOnTransientError } from '../retry_on_transient_error';

export interface PndExecutionQueryResult {
  /** The always-complete 14-row four-phase skeleton. */
  execution: GetExecutionResponse;
  /**
   * `false` when the server found **no** run of any correlated workflow for this
   * discovery, `true` when it found one, and `undefined` when it did not say —
   * which is not the same claim as `false`.
   */
  isCorrelated?: boolean;
}

/**
 * `GET /internal/pnd/executions/{correlationId}` — the four-phase projection of one
 * Attack Discovery, as a flat `steps` array covering every catalog row.
 *
 * Read with `asResponse: true` because the interesting fact is in a **header**. The body is always
 * the complete 14-row skeleton — there is no empty response and no count — so "no run correlated to
 * this discovery" and "a run exists and has not reached these rows yet" are the same body. They are
 * told apart by `x-pnd-execution-correlated`, and only by it: correlation scans a bounded window of
 * recent executions per workflow with no date bounds, so an older discovery legitimately correlates
 * to nothing, and a brand-new run legitimately shows an all-`not_started` skeleton. Rendering the
 * "could not correlate" screen for the second case would be a lie about a healthy run.
 *
 * Disabled without a discovery id rather than throwing, so the lifecycle view can render its own
 * "open this from a discovery" guidance without a failed query behind it. The route resolves the
 * discovery **as the calling user** and answers `404` when it is not readable, so a `404` here means
 * "not yours or not there", never "no lifecycle".
 */
export const usePndExecution = (
  correlationId: string | undefined
): UseQueryResult<PndExecutionQueryResult> => {
  const { services } = useKibana();

  return useQuery({
    enabled: Boolean(correlationId),
    queryFn: async (): Promise<PndExecutionQueryResult> => {
      if (!correlationId) {
        throw new Error('correlationId is required');
      }

      const { body, response } = await services.http!.get<GetExecutionResponse>(
        buildExecutionUrl(correlationId),
        {
          asResponse: true,
          version: API_VERSIONS.internal.v1,
        }
      );

      return {
        execution: body ?? { correlationId, steps: [] },
        isCorrelated: readPndSignalHeader(response, PND_EXECUTION_CORRELATED_HEADER),
      };
    },
    queryKey: queryKeys.executions.detail(correlationId),
    retry: retryOnTransientError,
  });
};
