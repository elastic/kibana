/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { WatchlistsFlyoutContent } from './watchlists_flyout_content';
import { useWatchlistFormState, useWatchlistMutations } from './hooks';

export type WatchlistsFlyoutMode = 'create' | 'edit';

export interface WatchlistsFlyoutParams extends Record<string, unknown> {
  mode?: WatchlistsFlyoutMode;
  watchlistId?: string;
  spaceId?: string;
}

export interface WatchlistsFlyoutExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'watchlists-flyout';
  params: WatchlistsFlyoutParams;
}

export const WatchlistsFlyoutPanel = ({
  mode = 'create',
  watchlistId,
  spaceId,
}: WatchlistsFlyoutParams) => {
  const { closeFlyout } = useExpandableFlyoutApi();
  const {
    watchlist,
    normalizedWatchlistId,
    isEditMode,
    isDisabled,
    isNameInvalid,
    setWatchlistField,
  } = useWatchlistFormState({
    mode,
    watchlistId,
  });
  const { mutation } = useWatchlistMutations({
    watchlist,
    watchlistId: normalizedWatchlistId,
    spaceId,
    isEditMode,
    onSuccess: closeFlyout,
  });

  const title = isEditMode
    ? i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.editTitle', {
        defaultMessage: 'Edit watchlist',
      })
    : i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.flyout.createTitle', {
        defaultMessage: 'Create watchlist',
      });

  return (
    <WatchlistsFlyoutContent
      title={title}
      watchlist={watchlist}
      isNameInvalid={isNameInvalid}
      onFieldChange={setWatchlistField}
      onSave={() => mutation.mutate()}
      isLoading={mutation.isLoading}
      isDisabled={isDisabled}
    />
  );
};
