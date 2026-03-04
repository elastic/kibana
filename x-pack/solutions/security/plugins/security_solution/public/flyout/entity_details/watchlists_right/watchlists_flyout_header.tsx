/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';

export interface WatchlistsFlyoutHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const WatchlistsFlyoutHeader = ({ title, children }: WatchlistsFlyoutHeaderProps) => {
  return (
    <FlyoutHeader data-test-subj="watchlist-flyout-header">
      <EuiFlexItem grow={false}>
        <FlyoutTitle title={title} />
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {children}
    </FlyoutHeader>
  );
};
