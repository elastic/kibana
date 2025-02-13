/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { type UseEuiTheme } from '@elastic/eui';

export const QuickStatsPanelStyle = (euiTheme: UseEuiTheme['euiTheme']) => css`
  background: ${euiTheme.colors.lightestShade};
  overflow: hidden;
`;

export const StatsGridContainerStyle = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
`;

export const StatsItemStyle = (euiTheme: UseEuiTheme['euiTheme']) => css`
  border: ${euiTheme.border.thin};
  min-width: 250px;
`;

export const AliasesContentStyle = css`
  max-height: 100px;
`;
