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

export const flexItemStyle = css`
  min-width: 0;
  max-width: 400px;
`;

// Absorbs leftover space when the URL item hits its max-width, keeping the button at the panel edge
export const copyButtonStyle = css`
  margin-inline-start: auto;
`;

export const typeSelectorStyle = ({ euiTheme }: UseEuiTheme) => css`
  border-right: ${euiTheme.border.thin};
  padding-right: ${euiTheme.size.s};
`;
