/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../../flyout_v2/shared/components/flyout_title';

export interface WatchlistsFlyoutHeaderProps {
  title: string;
}

export const WatchlistsFlyoutHeader = ({ title }: WatchlistsFlyoutHeaderProps) => {
  return (
    <FlyoutHeader data-test-subj="watchlist-flyout-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <FlyoutTitle title={title} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
