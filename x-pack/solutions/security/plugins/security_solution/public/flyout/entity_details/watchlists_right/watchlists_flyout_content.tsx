/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { WatchlistsFlyoutFooter } from './footer';
import { WatchlistForm } from './watchlist_form';
import { WatchlistsFlyoutHeader } from './watchlists_flyout_header';

export interface WatchlistsFlyoutContentProps {
  title: string;
  watchlist: CreateWatchlistRequestBodyInput;
  watchlistId?: string;
  isEditMode: boolean;
  isNameTooLong: boolean;
  isDescriptionTooLong: boolean;
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
  onSave: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  onSourceValidationChange: (valid: boolean) => void;
}

export const WatchlistsFlyoutContent = ({
  title,
  watchlist,
  watchlistId,
  isEditMode,
  isNameTooLong,
  isDescriptionTooLong,
  onFieldChange,
  onSave,
  isLoading,
  isDisabled,
  onSourceValidationChange,
}: WatchlistsFlyoutContentProps) => {
  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} isRulePreview={false} />
      <WatchlistsFlyoutHeader title={title} />
      <FlyoutBody>
        <WatchlistForm
          watchlist={watchlist}
          watchlistId={watchlistId}
          isEditMode={isEditMode}
          onFieldChange={onFieldChange}
          isNameTooLong={isNameTooLong}
          isDescriptionTooLong={isDescriptionTooLong}
          onSourceValidationChange={onSourceValidationChange}
        />
      </FlyoutBody>
      <WatchlistsFlyoutFooter onSave={onSave} isLoading={isLoading} isDisabled={isDisabled} />
    </>
  );
};
