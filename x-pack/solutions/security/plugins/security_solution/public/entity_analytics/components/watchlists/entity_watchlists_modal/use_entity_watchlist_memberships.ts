/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { GET_WATCHLISTS_QUERY_KEY } from '../../../api/hooks/use_get_watchlists';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

const MEMBERSHIPS_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.WATCHLISTS,
  'entity_watchlist_memberships'
);

export const getEntityWatchlistMembershipsQueryKey = (euid: string) =>
  ['GET', 'ENTITY_WATCHLIST_MEMBERSHIPS', euid] as const;

export const useEntityWatchlistMemberships = (euid: string) => {
  const { fetchEntityWatchlistMemberships } = useEntityAnalyticsRoutes();

  return useQuery({
    queryKey: getEntityWatchlistMembershipsQueryKey(euid),
    queryFn: ({ signal }) =>
      fetchEntityWatchlistMemberships({ euid, signal, context: MEMBERSHIPS_CONTEXT }),
    select: (response) => response.memberships,
  });
};

interface SaveEntityWatchlistsParams {
  euid: string;
  addTo: readonly string[];
  createNames?: readonly string[];
  removeFrom: readonly string[];
}

const NEW_WATCHLIST_RISK_MODIFIER = 1;

export const useSaveEntityWatchlists = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();
  const { assignWatchlistEntities, unassignWatchlistEntities, createWatchlist } =
    useEntityAnalyticsRoutes();

  return useMutation({
    mutationFn: async ({
      euid,
      addTo,
      createNames = [],
      removeFrom,
    }: SaveEntityWatchlistsParams) => {
      const created = await Promise.all(
        createNames.map((name) =>
          createWatchlist({
            name,
            description: '',
            riskModifier: NEW_WATCHLIST_RISK_MODIFIER,
          })
        )
      );
      const createdIds = created.flatMap(({ id }) => (id ? [id] : []));

      const [assignResults, unassignResults] = await Promise.all([
        Promise.all(
          [...addTo, ...createdIds].map((watchlistId) =>
            assignWatchlistEntities({ watchlistId, euids: [euid] })
          )
        ),
        Promise.all(
          removeFrom.map((watchlistId) => unassignWatchlistEntities({ watchlistId, euids: [euid] }))
        ),
      ]);

      const failed = [...assignResults, ...unassignResults].reduce(
        (count, result) => count + result.failed,
        0
      );
      if (failed > 0) {
        throw new Error(
          i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.partialFailure', {
            defaultMessage: '{failed} watchlist change(s) could not be applied.',
            values: { failed },
          })
        );
      }

      const assignNotFound = assignResults.reduce((count, result) => count + result.not_found, 0);
      if (assignNotFound > 0) {
        throw new Error(
          i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.notInStore', {
            defaultMessage: 'The entity was not found in the Entity Store.',
          })
        );
      }
    },
    onSuccess: async (_data, { euid }) => {
      addSuccess(
        i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.saveSuccess', {
          defaultMessage: 'Watchlists updated',
        })
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getEntityWatchlistMembershipsQueryKey(euid) }),
        queryClient.invalidateQueries({ queryKey: GET_WATCHLISTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['watchlists-management-table'] }),
      ]);
      onSuccess?.();
    },
    onError: (error: Error) => {
      addError(error, {
        title: i18n.translate('xpack.securitySolution.entityAnalytics.entityWatchlists.saveError', {
          defaultMessage: 'Failed to update watchlists',
        }),
      });
    },
  });
};
