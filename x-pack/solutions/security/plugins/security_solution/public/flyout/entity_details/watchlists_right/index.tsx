/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlyoutBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { WatchlistsFlyoutFooter } from './footer';
import { WatchlistForm } from './watchlist_form';
import { WatchlistsFlyoutHeader } from './watchlists_flyout_header';
import { useCreateWatchlist } from './hooks';

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

  const [watchlist, setWatchlist] = useState<CreateWatchlistRequestBodyInput>({
    name: watchlistName ?? '',
    description: '',
    riskModifier: 1.5,
    managed: false,
  });

  const setWatchlistField = <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => {
    setWatchlist((prev) => ({ ...prev, [key]: value }));
  };

  const { closeFlyout } = useExpandableFlyoutApi();
  const createMutation = useCreateWatchlist({
    watchlist,
    spaceId,
    onSuccess: closeFlyout,
  });

  const isDisabled = !watchlist.name.trim() || !watchlist.description?.trim();

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} isRulePreview={false} />

      <WatchlistsFlyoutHeader title={title}>
        <WatchlistForm watchlist={watchlist} onFieldChange={setWatchlistField} />
      </WatchlistsFlyoutHeader>
      <EuiFlyoutBody />
      <WatchlistsFlyoutFooter
        onSave={() => createMutation.mutate()}
        isLoading={createMutation.isLoading}
        isDisabled={isDisabled}
      />
    </>
  );
};
