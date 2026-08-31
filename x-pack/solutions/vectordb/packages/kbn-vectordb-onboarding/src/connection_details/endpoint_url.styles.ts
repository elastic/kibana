/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const urlStyle = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textParagraph};
  font-weight: ${euiTheme.font.weight.regular};
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const flexItemStyle = ({ euiTheme }: UseEuiTheme) => css`
  min-width: 0;
  max-width: ${euiTheme.base * 25}px;
`;

export const typeSelectorStyle = ({ euiTheme }: UseEuiTheme) => css`
  border-right: ${euiTheme.border.thin};
  padding-right: ${euiTheme.size.s};
`;
