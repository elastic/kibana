/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WatchlistsFlyoutFooter } from './footer';
import { WatchlistForm } from './watchlist_form';
import type { WatchlistsFlyoutMode } from './hooks/use_watchlist_form_state';
import { useWatchlistFormState, useWatchlistMutations } from './hooks';

const EDIT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.editTitle',
  { defaultMessage: 'Edit watchlist' }
);

const CREATE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.watchlists.flyout.createTitle',
  { defaultMessage: 'Create watchlist' }
);

export interface WatchlistFlyoutProps {
  mode: WatchlistsFlyoutMode;
  watchlistId?: string;
  spaceId?: string;
  onClose: () => void;
}

/**
 * Create / edit form for a watchlist, rendered in a plain (unmanaged) EuiFlyout.
 * Callers mount it only while it is open, so every open starts with fresh form state.
 */
export const WatchlistFlyout = ({ mode, watchlistId, spaceId, onClose }: WatchlistFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'watchlistFlyoutTitle' });
  const {
    watchlist,
    watchlistId: formWatchlistId,
    ruleBasedSourceIds,
    indexSourceWithMissingApiKey,
    isEditMode,
    isDisabled,
    isNameTooLong,
    isDescriptionTooLong,
    isRiskModifierInvalid,
    setWatchlistField,
    ruleBasedSource,
  } = useWatchlistFormState({
    mode,
    watchlistId,
  });
  const { mutation } = useWatchlistMutations({
    watchlist,
    watchlistId: formWatchlistId,
    ruleBasedSourceIds,
    spaceId,
    isEditMode,
    onSuccess: onClose,
  });

  return (
    <EuiFlyout
      session="never"
      size="m"
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="watchlistFlyout"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="watchlist-flyout-header">
        <EuiTitle size="s">
          <h2 id={titleId}>{isEditMode ? EDIT_TITLE : CREATE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <WatchlistForm
          watchlist={watchlist}
          watchlistId={formWatchlistId}
          indexSourceWithMissingApiKey={indexSourceWithMissingApiKey}
          isEditMode={isEditMode}
          onFieldChange={setWatchlistField}
          isNameTooLong={isNameTooLong}
          isDescriptionTooLong={isDescriptionTooLong}
          isRiskModifierInvalid={isRiskModifierInvalid}
          ruleBasedSource={ruleBasedSource}
        />
      </EuiFlyoutBody>
      <WatchlistsFlyoutFooter
        onSave={() => mutation.mutate()}
        isLoading={mutation.isLoading}
        isDisabled={isDisabled}
      />
    </EuiFlyout>
  );
};
