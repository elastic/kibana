/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { UpdateWatchlistRequestBodyInput } from '../../../../../../common/api/entity_analytics/watchlists/management/update.gen';
import type { CreateWatchlistRequestBodyInput } from '../../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { useKibana } from '../../../../../common/lib/kibana';
import { useEntityAnalyticsRoutes } from '../../../../api/api';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../../common/utils/execution_context';
import { getApiErrorMessage } from '../utils';

const WATCHLIST_UPDATE_CONTEXT = buildExecutionContext(
  EA_EXECUTION_CONTEXT_NAMES.WATCHLISTS,
  'watchlist_update'
);

export interface UseUpdateWatchlistOptions {
  watchlistId?: string;
  watchlist: CreateWatchlistRequestBodyInput;
  spaceId?: string;
  hasEntitySourceChanges?: boolean;
  onSuccess?: () => void;
}

/**
 * Only the rule-based sources (entity store or index) are edited in the form; integration sources
 * are managed separately. `undefined` leaves the sources as they are, `[]` removes them.
 */
const toRuleBasedSources = (
  entitySources: CreateWatchlistRequestBodyInput['entitySources']
): UpdateWatchlistRequestBodyInput['entitySources'] =>
  entitySources?.flatMap((source) => {
    const type = source.type ?? 'index';
    if (type !== 'store' && type !== 'index') {
      return [];
    }
    return [
      {
        type,
        name: source.name,
        indexPattern: source.indexPattern,
        identifierField: source.identifierField,
        queryRule: source.queryRule,
        enabled: source.enabled,
        ...(type === 'index' ? { range: source.range } : {}),
      },
    ];
  });

export const useUpdateWatchlist = ({
  watchlistId,
  watchlist,
  spaceId,
  hasEntitySourceChanges = false,
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

      return updateWatchlist(
        {
          id: watchlistId,
          body: {
            name: watchlist.name,
            description: watchlist.description,
            riskModifier: watchlist.riskModifier,
            managed: watchlist.managed,
            entitySources: hasEntitySourceChanges
              ? toRuleBasedSources(watchlist.entitySources)
              : undefined,
          },
        },
        WATCHLIST_UPDATE_CONTEXT
      );
    },
    onSuccess: async () => {
      toasts.addSuccess({
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlists.flyout.updateSuccessTitle',
          {
            defaultMessage: 'Watchlist updated successfully',
          }
        ),
        text: i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlists.flyout.updateSuccessText',
          {
            defaultMessage: 'Entities in the Watchlist may take a few minutes to synchronize.',
          }
        ),
      });
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
        toastMessage: getApiErrorMessage(error),
      });
    },
  });
};
