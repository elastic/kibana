/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  // @ts-expect-error
  EuiLoadingSpinnerSize,
} from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { rgba } from 'polished';
import React from 'react';

export interface LoaderProps {
  overlay?: boolean;
  overlayBackground?: string;
  size?: EuiLoadingSpinnerSize;
  children?: React.ReactChild;
}

export const Loader = React.memo<LoaderProps>(({ children, overlay, overlayBackground, size }) => {
  const { euiTheme } = useEuiTheme();

  const asideStyles = css`
    padding: ${euiTheme.size.m};
    ${overlay &&
    css`
      background: ${overlayBackground
        ? rgba(overlayBackground, 0.9)
        : rgba(euiTheme.colors.emptyShade, 0.9)};
      bottom: 0;
      left: 0;
      position: absolute;
      right: 0;
      top: 0;
      z-index: ${euiTheme.levels.flyout};
    `}
  `;

  const flexGroupStyles = overlay
    ? css`
        height: 100%;
      `
    : undefined;

  return (
    <aside css={asideStyles}>
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="s"
        justifyContent="center"
        css={flexGroupStyles}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner data-test-subj="loading-spinner" size={size} />
        </EuiFlexItem>

        {children && (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <p>{children}</p>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </aside>
  );
});

Loader.displayName = 'Loader';
