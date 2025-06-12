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
>;

const StyledEuiPanel = styled(EuiPanel)`
  padding: ${({ theme }) => theme.euiTheme.size.xl};
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

export const CardSectionPanel = memo<CardSectionPanelProps>((props) => {
  return <StyledEuiPanel {...props} hasBorder={false} hasShadow={false} paddingSize="l" />;
});
CardSectionPanel.displayName = 'CardSectionPanel';
