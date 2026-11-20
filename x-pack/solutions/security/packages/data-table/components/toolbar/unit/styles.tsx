/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiFontSize } from '@elastic/eui';
import styled from '@emotion/styled';

export const UnitCount = styled.span`
  font-size: ${({ theme }) => euiFontSize(theme, 'xs').fontSize};
  font-weight: ${({ theme }) => theme.euiTheme.font.weight.semiBold};
  border-right: ${({ theme }) => theme.euiTheme.border.thin};
  margin-right: ${({ theme }) => theme.euiTheme.size.s};
  padding-right: ${({ theme }) => theme.euiTheme.size.m};
`;
