/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const VerticalSeparatorStyle = ({ euiTheme }: UseEuiTheme) => css`
  border-left: ${euiTheme.border.thin};
  height: ${euiTheme.size.l};
`;

export const CloudLinksPillStyle = ({ euiTheme }: UseEuiTheme) => css`
  background: ${euiTheme.colors.backgroundBasePrimary};
  border-radius: ${euiTheme.size.m};
  height: 24px;
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
`;
