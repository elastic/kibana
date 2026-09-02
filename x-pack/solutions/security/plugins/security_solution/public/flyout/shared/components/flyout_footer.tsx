/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface FlyoutFooterProps extends React.ComponentProps<typeof EuiFlyoutFooter> {
  children: React.ReactNode;
}

/**
 * Wrapper of `EuiFlyoutFooter`, setting the recommended `16px` padding.
 */
export const FlyoutFooter: FC<FlyoutFooterProps> = memo(({ children, ...flyoutFooterProps }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyoutFooter {...flyoutFooterProps}>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
});

FlyoutFooter.displayName = 'FlyoutFooter';
