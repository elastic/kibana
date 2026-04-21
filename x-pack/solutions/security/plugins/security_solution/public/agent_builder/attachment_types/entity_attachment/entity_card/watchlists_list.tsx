/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface WatchlistsListProps {
  watchlistIds: string[];
}

const LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.entityAttachment.card.watchlistsLabel',
  { defaultMessage: 'Watchlists' }
);

export const WatchlistsList: React.FC<WatchlistsListProps> = ({ watchlistIds }) => {
  if (!watchlistIds || watchlistIds.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        wrap
        responsive={false}
        data-test-subj="entityAttachmentWatchlists"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {LABEL}
          </EuiText>
        </EuiFlexItem>
        {watchlistIds.map((id) => (
          <EuiFlexItem grow={false} key={id}>
            <EuiBadge color="hollow">{id}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
