/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_DISCOVERY_CONTEXT_URL } from '@kbn/pnd-common';
import type { GetDiscoveryContextResponse } from '@kbn/pnd-common';

import { queryKeys } from '../../query_keys';
import { retryOnTransientError } from '../retry_on_transient_error';
import { toRequestedAlertIds } from './helpers/to_requested_alert_ids';

/** What a response with no body is read as: no enrichment, which is a valid answer here. */
const NO_DISCOVERY_CONTEXT: GetDiscoveryContextResponse = { contexts: [] };

export interface UseDiscoveryContextOptions {
  /**
   * The discoveries the proposals on screen carry, straight off the rows — duplicates, uncorrelated
   * `''` ids and all. Normalizing them is this hook's job, not its caller's.
   */
  correlationIds: readonly string[];
  /** `false` while there is no surface on screen to enrich. */
  enabled?: boolean;
}

/**
 * `GET /internal/pnd/discovery-context` — the blast radius entities and the normalized risk score,
 * derived together for the discoveries the queue is currently showing (decision D10).
 *
 * **One read, one key, two surfaces.** Annotation 3's chips and annotation 5's badge come from the
 * same body, so the entities an analyst sees and the score beside a row can never disagree about which
 * discoveries they describe.
 *
 * **The route always answers 200.** A failed aggregation degrades to `{ contexts: [] }` server-side
 * rather than to a 500, because a blast radius is an overlay on rows that render perfectly well
 * without it. So there is no error state to render here: a rejection is a transport or authorization
 * failure, and the only two outcomes on screen are chips and no chips. Its own cache key is what keeps
 * that promise — a refused enrichment cannot disturb the pending decisions drawn from
 * `queryKeys.proposals.list()`.
 *
 * The response may be **shorter** than the request. An unreadable id (the S3 guard filtered it) and a
 * discovery whose constituent alerts have aged out are both simply absent, which is why every consumer
 * keys on `correlationId` rather than matching by position.
 */
export const useDiscoveryContext = ({
  correlationIds,
  enabled = true,
}: UseDiscoveryContextOptions): UseQueryResult<GetDiscoveryContextResponse> => {
  const { services } = useKibana();

  const requestedIds = useMemo(() => toRequestedAlertIds(correlationIds), [correlationIds]);

  return useQuery({
    // Nothing to enrich is not an empty enrichment: with no correlated proposal on screen there is no
    // request to make, and the section renders nothing rather than an empty row.
    enabled: enabled && requestedIds.length > 0,
    queryFn: async (): Promise<GetDiscoveryContextResponse> => {
      const body = await services.http!.get<GetDiscoveryContextResponse>(
        PND_DISCOVERY_CONTEXT_URL,
        {
          query: { correlationIds: requestedIds },
          version: API_VERSIONS.internal.v1,
        }
      );

      return body ?? NO_DISCOVERY_CONTEXT;
    },
    queryKey: queryKeys.discoveryContext.list(requestedIds),
    retry: retryOnTransientError,
  });
};
