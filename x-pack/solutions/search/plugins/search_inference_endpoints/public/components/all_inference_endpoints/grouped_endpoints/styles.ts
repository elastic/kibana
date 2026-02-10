/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { type UseEuiTheme } from '@elastic/eui';

export const GroupPanelStyle = ({ euiTheme }: UseEuiTheme) => css`
  .euiAccordion__triggerWrapper {
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-bottom: ${euiTheme.border.thin};
    padding-left: ${euiTheme.size.s};
  }
`;
