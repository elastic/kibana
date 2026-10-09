/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import type { EuiPanelProps } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';

export type CardSectionPanelProps = Exclude<
  EuiPanelProps,
  'hasBorder' | 'hasShadow' | 'paddingSize'
> & {
  /** Inset like a bordered collapsible card so grid column labels line up. */
  gridHeader?: boolean;
};

const StyledEuiPanel = styled(EuiPanel, {
  shouldForwardProp: (prop) => prop !== 'gridHeader',
})<CardSectionPanelProps>`
  padding: ${({ gridHeader, theme }) =>
    // Match the collapsible card inset (section padding + outer border) so column tracks line up.
    gridHeader
      ? `0 calc(${theme.euiTheme.size.l} + ${theme.euiTheme.border.width.thin}) ${theme.euiTheme.size.s}`
      : theme.euiTheme.size.xl};
  &.top-section {
    padding-bottom: ${({ theme }) => theme.euiTheme.size.l};
  }
  &.bottom-section {
    padding-top: ${({ theme }) => theme.euiTheme.size.l};
  }
  &.artifact-entry-collapsible-card {
    padding: ${({ theme }) => theme.euiTheme.size.l} !important;
  }
`;

export const CardSectionPanel = memo<CardSectionPanelProps>(({ gridHeader = false, ...props }) => {
  return (
    <StyledEuiPanel
      {...props}
      gridHeader={gridHeader}
      hasBorder={false}
      hasShadow={false}
      paddingSize={gridHeader ? 'none' : 'l'}
    />
  );
});
CardSectionPanel.displayName = 'CardSectionPanel';
