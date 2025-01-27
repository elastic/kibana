/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  // @ts-expect-error
  EuiLoadingSpinnerSize,
  EuiFlexGroupProps,
} from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { rgba } from 'polished';
import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

const Aside = styled.aside<{ overlay?: boolean; overlayBackground?: string }>`
  padding: ${({ theme: { euiTheme } }) => euiTheme.size.m};

  ${({ overlay, overlayBackground, theme: { euiTheme } }) =>
    overlay &&
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
// z-index: ${theme.eui.euiZLevel1};
Aside.displayName = 'Aside';

interface FlexGroupProps extends EuiFlexGroupProps {
  overlay?: { overlay?: boolean };
}

const FlexGroup = styled(EuiFlexGroup, {
  shouldForwardProp: (prop) => prop !== 'overlay',
})<FlexGroupProps>(
  ({ overlay }) =>
    overlay?.overlay &&
    css`
      height: 100%;
    `
);

FlexGroup.defaultProps = {
  alignItems: 'center',
  direction: 'column',
  gutterSize: 's',
  justifyContent: 'center',
};

FlexGroup.displayName = 'FlexGroup';

export interface LoaderProps {
  overlay?: boolean;
  overlayBackground?: string;
  size?: EuiLoadingSpinnerSize;
  children?: React.ReactChild;
}

export const Loader = React.memo<LoaderProps>(({ children, overlay, overlayBackground, size }) => (
  <Aside overlay={overlay} overlayBackground={overlayBackground}>
    <FlexGroup overlay={{ overlay }}>
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
    </FlexGroup>
  </Aside>
));

Loader.displayName = 'Loader';
