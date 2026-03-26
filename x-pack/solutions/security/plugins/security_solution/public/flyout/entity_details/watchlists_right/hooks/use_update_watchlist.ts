/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { useKibana } from '../../../../common/lib/kibana';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';

export interface UseUpdateWatchlistOptions {
  watchlistId?: string;
  watchlist: CreateWatchlistRequestBodyInput;
  spaceId?: string;
  onSuccess?: () => void;
}

export const useUpdateWatchlist = ({
  watchlistId,
  watchlist,
  spaceId,
  onSuccess,
}: UseUpdateWatchlistOptions) => {
  const queryClient = useQueryClient();
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { updateWatchlist } = useEntityAnalyticsRoutes();

  return useMutation({
    mutationFn: async () => {
      if (!watchlistId) {
        throw new Error('Missing watchlist id');
      }
      return updateWatchlist({ id: watchlistId, body: watchlist });
    },
    onSuccess: async () => {
      toasts.addSuccess(
        i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.updateSuccess', {
          defaultMessage: 'Watchlist updated successfully',
        })
      );
      if (spaceId) {
        await queryClient.invalidateQueries({
          queryKey: ['watchlists-management-table', spaceId],
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['watchlists-management-table'] });
      }
      onSuccess?.();
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlists.flyout.updateError',
          {
            defaultMessage: 'Failed to update watchlist',
          }
        ),
      });
    },
  });
};
