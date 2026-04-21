/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import type { SourceType } from './rule_based_source_helpers';
import { useCreateWatchlist } from './use_create_watchlist';
import { useUpdateWatchlist } from './use_update_watchlist';

export interface UseWatchlistMutationsParams {
  watchlist: CreateWatchlistRequestBodyInput;
  watchlistId?: string;
  /** Maps source type ('store' | 'index') → persisted entity-source ID. */
  ruleBasedSourceIds: Partial<Record<SourceType, string>>;
  spaceId?: string;
  isEditMode: boolean;
  onSuccess: () => void;
}

export const useWatchlistMutations = ({
  watchlist,
  watchlistId,
  ruleBasedSourceIds,
  spaceId,
  isEditMode,
  onSuccess,
}: UseWatchlistMutationsParams) => {
  const createMutation = useCreateWatchlist({
    watchlist,
    spaceId,
    onSuccess,
  });
  const updateMutation = useUpdateWatchlist({
    watchlistId,
    ruleBasedSourceIds,
    watchlist,
    spaceId,
    onSuccess,
  });

  return {
    createMutation,
    updateMutation,
    mutation: isEditMode ? updateMutation : createMutation,
  };
};
