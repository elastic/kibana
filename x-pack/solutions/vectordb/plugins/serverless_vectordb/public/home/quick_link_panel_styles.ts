/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const quickLinkInnerStyle = ({ euiTheme }: UseEuiTheme) => css`
  height: 100%;
  padding: 0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s};
`;

export const quickLinkBoldLabelStyle = ({ euiTheme }: UseEuiTheme) => css`
  font-weight: ${euiTheme.font.weight.bold};
`;
