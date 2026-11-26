/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import { EuiPanel } from '@elastic/eui';

export const whiteSpaceNoWrapCSS = { 'white-space': 'nowrap' };
export const autoOverflowXCSS = { 'overflow-x': 'auto' };

export const VerticalDivider = styled.span`
  width: 0;
  height: 20px;
  border-left: 1px solid ${({ theme }) => theme.euiTheme.colors.lightShade};
`;

export const TimelinePanel = styled(EuiPanel)`
  background-color: ${({ theme }) => theme.euiTheme.colors.emptyShade};
  color: ${({ theme }) => theme.euiTheme.colors.textParagraph};
  padding-inline: ${({ theme }) => theme.euiTheme.size.m};
  border-radius: ${({ theme }) => theme.euiTheme.border.radius.medium};
`;
