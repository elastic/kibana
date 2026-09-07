/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useAppToasts } from '../../../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../../../api/api';

export const useDeleteWatchlist = (spaceId: string) => {
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();
  const { deleteWatchlist } = useEntityAnalyticsRoutes();

  return useMutation({
    mutationFn: (id: string) => deleteWatchlist({ id }),
    onSuccess: async () => {
      addSuccess(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteSuccess',
          {
            defaultMessage: 'Watchlist deleted successfully',
          }
        )
      );
      await queryClient.invalidateQueries({
        queryKey: ['watchlists-management-table', spaceId],
      });
    },
    onError: (error: Error) => {
      addError(error, {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlistsManagement.deleteError',
          {
            defaultMessage: 'Failed to delete watchlist',
          }
        ),
      });
    },
  });
};
