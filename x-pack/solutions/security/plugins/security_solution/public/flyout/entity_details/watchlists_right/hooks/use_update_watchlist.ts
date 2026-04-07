/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import type { UpdateWatchlistEntitySourceRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/data_source/update.gen';
import { useKibana } from '../../../../common/lib/kibana';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';

export interface UseUpdateWatchlistOptions {
  watchlistId?: string;
  entitySourceId?: string;
  watchlist: CreateWatchlistRequestBodyInput;
  spaceId?: string;
  onSuccess?: () => void;
}

export const useUpdateWatchlist = ({
  watchlistId,
  entitySourceId,
  watchlist,
  spaceId,
  onSuccess,
}: UseUpdateWatchlistOptions) => {
  const queryClient = useQueryClient();
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { updateWatchlist, updateWatchlistEntitySource } = useEntityAnalyticsRoutes();

  return useMutation({
    mutationFn: async () => {
      if (!watchlistId) {
        throw new Error('Missing watchlist id');
      }

      // Update the watchlist itself (name, description, riskModifier)
      const updatedWatchlist = await updateWatchlist({ id: watchlistId, body: watchlist });

      // If we have an entity source to update, send the update
      const firstEntitySource = watchlist.entitySources?.[0];
      if (entitySourceId && firstEntitySource) {
        const entitySourceBody: UpdateWatchlistEntitySourceRequestBodyInput = {
          name: firstEntitySource.name,
          indexPattern: firstEntitySource.indexPattern,
          identifierField: firstEntitySource.identifierField,
          queryRule: firstEntitySource.queryRule,
          enabled: firstEntitySource.enabled,
        };

        await updateWatchlistEntitySource({
          watchlistId,
          entitySourceId,
          body: entitySourceBody,
        });
      }

      return updatedWatchlist;
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
      // Also invalidate the entity sources cache so re-opening the edit flyout shows fresh data
      await queryClient.invalidateQueries({
        queryKey: ['watchlist-entity-sources', watchlistId],
      });
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
