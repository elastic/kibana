/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { PndWatchesNav, type WatchesSectionId } from './pnd_watches_nav';

interface WatchesSectionLayoutProps {
  active: WatchesSectionId;
  children: React.ReactNode;
}

export const WatchesSectionLayout: React.FC<WatchesSectionLayoutProps> = ({ active, children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      css={css`
        flex: 1;
        min-height: 0;
        height: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <PndWatchesNav active={active} />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          min-width: 0;
          min-height: 0;
          overflow: auto;
          background: ${euiTheme.colors.body};
        `}
      >
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
