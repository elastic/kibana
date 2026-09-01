/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutHeader, EuiPanel } from '@elastic/eui';

interface FlyoutHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  children: React.ReactNode;
  /**
   * Overrides for the inner `EuiPanel` that provides the recommended `16px` padding. Callers can
   * e.g. pass `{ paddingSize: 'none' }` to render a more compact header.
   */
  panelProps?: React.ComponentProps<typeof EuiPanel>;
}

/**
 * Wrapper of `EuiFlyoutHeader`, setting the recommended `16px` padding using a EuiPanel.
 */
export const FlyoutHeader: FC<FlyoutHeaderProps> = memo(
  ({ children, panelProps, ...flyoutHeaderProps }) => {
    return (
      <EuiFlyoutHeader hasBorder {...flyoutHeaderProps}>
        <EuiPanel hasShadow={false} color="transparent" {...panelProps}>
          {children}
        </EuiPanel>
      </EuiFlyoutHeader>
    );
  }
);

FlyoutHeader.displayName = 'FlyoutHeader';
