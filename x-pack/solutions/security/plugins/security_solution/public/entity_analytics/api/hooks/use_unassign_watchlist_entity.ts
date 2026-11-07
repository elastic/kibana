/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { ENTITY_GRID_QUERY_KEY } from '../../components/home/entities_grid/common';
import { useEntityAnalyticsRoutes } from '../api';
import { GET_WATCHLISTS_QUERY_KEY } from './use_get_watchlists';
import { MANUAL_WATCHLIST_ENTITIES_QUERY_KEY } from './use_manual_watchlist_entities';

const REMOVED_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.removedToastTitle',
  { defaultMessage: 'Entity removed from the watchlist' }
);

const REMOVED_TOAST_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.removedToastText',
  { defaultMessage: 'It stays on the watchlist if a rule also matches it.' }
);

const REMOVE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.manualEntities.removeError',
  { defaultMessage: 'Failed to remove the entity from the watchlist' }
);

const UNASSIGN_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.unassignError',
  { defaultMessage: 'Unable to remove the entity from the watchlist' }
);

/**
 * Removes the manual assignment of one entity from a watchlist, and refreshes everything that shows
 * it: the manual list, the watchlists (their entity counts and sources), and the entities grid.
 * The entity stays on the watchlist when a rule also puts it there.
 */
export const useUnassignWatchlistEntity = () => {
  const { unassignWatchlistEntities } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();

  return useMutation({
    mutationFn: async ({ watchlistId, euid }: { watchlistId: string; euid: string }) => {
      const response = await unassignWatchlistEntities({ watchlistId, body: { euids: [euid] } });
      if (response.failed > 0 || response.not_found > 0) {
        throw new Error(response.items.find(({ error }) => error)?.error ?? UNASSIGN_ERROR);
      }
    },
    onSuccess: () => {
      addSuccess({ title: REMOVED_TOAST_TITLE, text: REMOVED_TOAST_TEXT });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [MANUAL_WATCHLIST_ENTITIES_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['watchlists-management-table'] }),
        queryClient.invalidateQueries({ queryKey: GET_WATCHLISTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [ENTITY_GRID_QUERY_KEY] }),
      ]);
    },
    onError: (error: Error) => {
      addError(error, { title: REMOVE_ERROR_TOAST_TITLE });
    },
  });
};
