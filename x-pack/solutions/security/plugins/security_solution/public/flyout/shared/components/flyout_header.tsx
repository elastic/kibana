/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { EuiFlyoutHeader } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';

interface FlyoutHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  children: React.ReactNode;
}

/**
 * Wrapper of `EuiFlyoutHeader`, setting the recommended `16px` padding using a EuiPanel.
 */
export const FlyoutHeader: FC<FlyoutHeaderProps> = memo(({ children, ...flyoutHeaderProps }) => {
  return (
    <EuiPanel hasShadow={false} color="transparent">
      {children}
    </EuiPanel>
  );
});

FlyoutHeader.displayName = 'FlyoutHeader';
