/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiTextTruncate, type UseEuiTheme } from '@elastic/eui';

export const newIndexValue = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.textHeading};
  font-weight: ${euiTheme.font.weight.bold};
`;

export const newIndexStat = css`
  white-space: nowrap;
`;

export const newIndexName = ({ euiTheme }: UseEuiTheme) => css`
  ${euiTextTruncate(`${euiTheme.base * 18}px`)}
`;

export const newIndexShrinkable = css`
  min-inline-size: 0;
`;

export const newIndexFooter = ({ euiTheme }: UseEuiTheme) => css`
  border-block-start: ${euiTheme.border.thin};
`;
