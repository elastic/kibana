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
import type { SourceType } from './rule_based_source_helpers';

export interface UseUpdateWatchlistOptions {
  watchlistId?: string;
  ruleBasedSourceIds: Partial<Record<SourceType, string>>;
  watchlist: CreateWatchlistRequestBodyInput;
  spaceId?: string;
  onSuccess?: () => void;
}

export const useUpdateWatchlist = ({
  watchlistId,
  ruleBasedSourceIds,
  watchlist,
  spaceId,
  onSuccess,
}: UseUpdateWatchlistOptions) => {
  const queryClient = useQueryClient();
  const {
    notifications: { toasts },
  } = useKibana().services;
  const { updateWatchlist, updateWatchlistEntitySource, createWatchlistEntitySource } =
    useEntityAnalyticsRoutes();

  return useMutation({
    mutationFn: async () => {
      if (!watchlistId) {
        throw new Error('Missing watchlist id');
      }

      // Update the watchlist itself (name, description, riskModifier)
      const updatedWatchlist = await updateWatchlist({ id: watchlistId, body: watchlist });

      // Process each rule-based entity source independently.
      // For each source in the form, either update the persisted one or create a new one.
      for (const source of watchlist.entitySources ?? []) {
        const sourceType = source.type ?? 'index';
        // Only 'store' and 'index' sources are editable via the flyout.
        // Integration sources (e.g. managed PUM sources like okta/AD) are
        // never included in the form state and should not be updated here.
        const isRuleBasedType = (t: string): t is SourceType => t === 'store' || t === 'index';
        const existingId = isRuleBasedType(sourceType) ? ruleBasedSourceIds[sourceType] : undefined;

        if (existingId) {
          // Existing rule-based source of this type → update it
          const entitySourceBody: UpdateWatchlistEntitySourceRequestBodyInput = {
            name: source.name,
            indexPattern: source.indexPattern,
            identifierField: source.identifierField,
            queryRule: source.queryRule,
            enabled: source.enabled,
          };

          await updateWatchlistEntitySource({
            watchlistId,
            entitySourceId: existingId,
            body: entitySourceBody,
          });
        } else {
          // No existing rule-based source of this type → create a new one
          await createWatchlistEntitySource({
            watchlistId,
            body: {
              type: sourceType,
              name: source.name,
              indexPattern: source.indexPattern,
              identifierField: source.identifierField,
              queryRule: source.queryRule,
              enabled: source.enabled,
            },
          });
        }
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
