/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_AUTONOMY_URL, PND_PROPOSALS_AUTO_RESPOND_URL } from '@kbn/pnd-common';
import type {
  AutoRespondToProposalsRequestBody,
  AutoRespondToProposalsResponse,
  GetAutonomyResponse,
  SetAutonomyRequestBody,
  SetAutonomyResponse,
} from '@kbn/pnd-common';
import { queryKeys } from '../../query_keys';
import { isManagedWatchId } from '../is_managed_watch_id';
import { retryOnTransientError } from '../retry_on_transient_error';

/**
 * `GET /internal/pnd/autonomy` — the level the **gates actually read**.
 *
 * This is deliberately not `watch.autonomyLevel`: the watch projection returns the
 * YAML's `consts.watch_policy.autonomyLevel`, while every gate resolves its
 * auto-accept decision from the `pnd:autonomy:<watchId>` uiSetting this route
 * serves. They are two independent numbers and they can disagree, so anything
 * that claims to show "the autonomy level" must read this one.
 *
 * Disabled for any id outside the managed allow-list, which the route 400s.
 */
export const useAutonomy = (watchId: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    enabled: isManagedWatchId(watchId),
    queryKey: queryKeys.autonomy.detail(watchId),
    queryFn: async (): Promise<GetAutonomyResponse> => {
      if (!isManagedWatchId(watchId)) {
        throw new Error('a managed watch id is required');
      }

      return services.http!.get<GetAutonomyResponse>(PND_AUTONOMY_URL, {
        query: { watchId },
        version: API_VERSIONS.internal.v1,
      });
    },
    retry: retryOnTransientError,
  });
};

/**
 * `PUT /internal/pnd/autonomy` — the operator write path, gated on
 * `pnd_manage_autonomy` (see `useCanManageAutonomy`).
 *
 * The response is the route's own re-read of the level plus the `autoAccept` map
 * it implies, so it is seeded straight into the cache: the dial then shows what
 * was persisted rather than what was requested.
 */
export const useSetAutonomy = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      autonomyLevel,
      watchId,
    }: SetAutonomyRequestBody): Promise<SetAutonomyResponse> =>
      services.http!.put<SetAutonomyResponse>(PND_AUTONOMY_URL, {
        body: JSON.stringify({ autonomyLevel, watchId }),
        version: API_VERSIONS.internal.v1,
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.autonomy.detail(data.watchId), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.autonomy.detail(data.watchId) });
    },
  });
};

/**
 * `POST /internal/pnd/proposals/_auto_respond` — auto-accept the already-pending
 * gates the current level permits.
 *
 * Raising the dial does **not** retroactively resume gates that are already
 * waiting, so a raise has to be followed by an auto-respond to take effect on
 * live runs. `_auto_respond` refuses both `alwaysGate` gates at every level, so
 * this can never contain an incident or apply a rule tuning on a human's behalf.
 *
 * The dial always sends `origin: 'dial'`. The machine path (after `.6`) sends
 * `origin: 'auto'`.
 *
 * Invalidates proposals **and** runs: the response carries only counts, so there
 * is no id to key a targeted update off.
 */
export const useAutoRespondToProposals = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      origin,
      watchId,
    }: AutoRespondToProposalsRequestBody): Promise<AutoRespondToProposalsResponse> =>
      services.http!.post<AutoRespondToProposalsResponse>(PND_PROPOSALS_AUTO_RESPOND_URL, {
        body: JSON.stringify({ origin, watchId }),
        version: API_VERSIONS.internal.v1,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
    },
  });
};
