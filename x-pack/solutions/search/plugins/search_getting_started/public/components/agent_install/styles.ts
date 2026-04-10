/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const AgentBuilderPanelContainer = ({ euiTheme }: UseEuiTheme) => css`
  border-top: ${euiTheme.border.thin};
  border-left: none;

  ${euiTheme.breakpoint.m} {
    border-top: none;
    border-left: ${euiTheme.border.thin};
  }
`;
