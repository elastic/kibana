/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { WatchlistsFlyoutFooter } from './footer';
import { WatchlistForm } from './watchlist_form';
import { WatchlistsFlyoutHeader } from './watchlists_flyout_header';
import { useCreateWatchlist, useGetWatchlist, useUpdateWatchlist } from './hooks';

export type WatchlistsFlyoutMode = 'create' | 'edit';

export interface WatchlistsFlyoutParams extends Record<string, unknown> {
  mode?: WatchlistsFlyoutMode;
  watchlistId?: string;
  watchlistName?: string;
  spaceId?: string;
}

export interface WatchlistsFlyoutExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'watchlists-flyout';
  params: WatchlistsFlyoutParams;
}

export const WatchlistsFlyoutPanel = ({
  mode = 'create',
  watchlistId,
  watchlistName,
  spaceId,
}: WatchlistsFlyoutParams) => {
  const isEditMode = mode === 'edit';
  const title = isEditMode
    ? i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.editTitle', {
        defaultMessage: 'Edit watchlist',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.createTitle', {
        defaultMessage: 'Create watchlist',
      });

  const defaultWatchlist = useMemo<CreateWatchlistRequestBodyInput>(
    () => ({
      name: watchlistName ?? '',
      description: '',
      riskModifier: 1.5,
      managed: false,
    }),
    [watchlistName]
  );
  const [initialWatchlist, setInitialWatchlist] =
    useState<CreateWatchlistRequestBodyInput>(defaultWatchlist);
  const [watchlist, setWatchlist] = useState<CreateWatchlistRequestBodyInput>(defaultWatchlist);
  const [hasUserEdits, setHasUserEdits] = useState(false);

  const setWatchlistField = <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => {
    setWatchlist((prev) => ({ ...prev, [key]: value }));
    setHasUserEdits(true);
  };

  const { closeFlyout } = useExpandableFlyoutApi();
  const createMutation = useCreateWatchlist({
    watchlist,
    spaceId,
    onSuccess: closeFlyout,
  });
  const updateMutation = useUpdateWatchlist({
    watchlistId,
    watchlist,
    spaceId,
    onSuccess: closeFlyout,
  });
  const { initialWatchlist: fetchedWatchlist } = useGetWatchlist(
    isEditMode ? watchlistId : undefined
  );

  useEffect(() => {
    if (isEditMode || hasUserEdits) {
      return;
    }

    setInitialWatchlist(defaultWatchlist);
    setWatchlist(defaultWatchlist);
  }, [defaultWatchlist, hasUserEdits, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !fetchedWatchlist || hasUserEdits) {
      return;
    }

    setInitialWatchlist(fetchedWatchlist);
    setWatchlist(fetchedWatchlist);
  }, [fetchedWatchlist, hasUserEdits, isEditMode]);

  useEffect(() => {
    if (isEditMode && watchlistId) {
      setHasUserEdits(false);
    }
  }, [isEditMode, watchlistId]);

  const isMissingId = isEditMode && !watchlistId;
  const hasChanges = isEditMode
    ? watchlist.name.trim() !== initialWatchlist.name.trim() ||
      watchlist.description?.trim() !== initialWatchlist.description?.trim() ||
      watchlist.riskModifier !== initialWatchlist.riskModifier
    : true;
  const isDisabled =
    isMissingId ||
    (isEditMode ? !hasChanges : !watchlist.name.trim() || !watchlist.description?.trim());
  const mutation = isEditMode ? updateMutation : createMutation;

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} isRulePreview={false} />

      <WatchlistsFlyoutHeader title={title} />
      <FlyoutBody>
        <WatchlistForm watchlist={watchlist} onFieldChange={setWatchlistField} />
      </FlyoutBody>
      <WatchlistsFlyoutFooter
        onSave={() => mutation.mutate()}
        isLoading={mutation.isLoading}
        isDisabled={isDisabled}
      />
    </>
  );
};
