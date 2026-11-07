/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { toEntitySourceArray } from '../../../../../flyout/entity_details/shared/components/entity_source_value';
import { GET_WATCHLISTS_QUERY_KEY } from '../../../../api/hooks/use_get_watchlists';
import { useWatchlistsPrivileges } from '../../../../api/hooks/use_watchlists_privileges';
import { useWatchlistManualEntitiesEnabled } from '../../../../hooks/use_watchlist_manual_entities_enabled';
import { AddToWatchlistModal } from '../components/add_to_watchlist_modal';
import type { Row } from '../common';
import { OWN_WATCHLISTS_FIELD, WATCHLISTS_FIELD } from '../queries/resolved_entities';
import { getEntityId } from '../common';
import { useInvalidateEntityGrid } from './use_invalidate_entity_grid';

interface Target {
  entityId: string;
  assignedWatchlistIds: string[];
}

/**
 * The "Add to watchlist" row action and its modal. The action is undefined, which hides the menu
 * item, when watchlists or manually added entities are off, or the user cannot manage watchlists.
 */
export const useAddToWatchlistAction = () => {
  const isWatchlistsEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsWatchlistEnabled');
  const isManualEntitiesEnabled = useWatchlistManualEntitiesEnabled();
  const { data: privileges, error: privilegesError } = useWatchlistsPrivileges();
  const invalidateEntityGrid = useInvalidateEntityGrid();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Target>();

  const canAddToWatchlist =
    isWatchlistsEnabled &&
    isManualEntitiesEnabled &&
    !privilegesError &&
    (privileges?.has_all_required ?? false);

  const onAddToWatchlist = useCallback((row: Row) => {
    const entityId = getEntityId(row);
    if (!entityId) return;
    setTarget({
      entityId,
      // A grouped row's own field holds the whole group's watchlists, but the action acts on the
      // main entity alone, so what is already added is the main entity's own.
      assignedWatchlistIds: toEntitySourceArray(
        OWN_WATCHLISTS_FIELD in row ? row[OWN_WATCHLISTS_FIELD] : row[WATCHLISTS_FIELD]
      ),
    });
  }, []);

  const closeModal = useCallback(() => setTarget(undefined), []);

  // The grid shows the entity's watchlists; the watchlist lists show each one's entity count and
  // its Manual source, so they refetch too.
  const onAssigned = useCallback(() => {
    invalidateEntityGrid();
    queryClient.invalidateQueries({ queryKey: ['watchlists-management-table'] });
    queryClient.invalidateQueries({ queryKey: GET_WATCHLISTS_QUERY_KEY });
  }, [invalidateEntityGrid, queryClient]);

  return {
    onAddToWatchlist: canAddToWatchlist ? onAddToWatchlist : undefined,
    addToWatchlistModal: target ? (
      <AddToWatchlistModal
        entityId={target.entityId}
        assignedWatchlistIds={target.assignedWatchlistIds}
        onClose={closeModal}
        onAssigned={onAssigned}
      />
    ) : null,
  };
};
