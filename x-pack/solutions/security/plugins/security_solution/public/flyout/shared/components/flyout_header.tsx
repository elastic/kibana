/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { EuiPanelProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface FlyoutHeaderProps extends React.ComponentProps<typeof EuiFlyoutHeader> {
  children: React.ReactNode;
  /**
   * Overrides for the inner padding wrapper. Callers can e.g. pass `{ paddingSize: 'none' }`
   * to render a more compact header.
   */
  panelProps?: Pick<EuiPanelProps, 'paddingSize' | 'css'>;
}

/**
 * Wrapper of `EuiFlyoutHeader`, setting the recommended `16px` padding.
 */
export const FlyoutHeader: FC<FlyoutHeaderProps> = memo(
  ({ children, panelProps, ...flyoutHeaderProps }) => {
    const { euiTheme } = useEuiTheme();
    const paddingSize = panelProps?.paddingSize ?? 'm';

    return (
      <EuiFlyoutHeader hasBorder {...flyoutHeaderProps}>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          responsive={false}
          css={[
            paddingSize !== 'none' &&
              css`
                padding: ${euiTheme.size[paddingSize]};
              `,
            panelProps?.css,
          ]}
        >
          <EuiFlexItem>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    );
  }
);

FlyoutHeader.displayName = 'FlyoutHeader';
