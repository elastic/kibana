/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const accordionCss = ({ euiTheme }: UseEuiTheme) =>
  css({
    padding: `14px ${euiTheme.size.base}`,
    border: `1px solid ${euiTheme.border.color}`,
    borderRadius: euiTheme.border.radius.medium,
    '.euiAccordion__button:is(:hover, :focus)': {
      textDecoration: 'none',
    },
    '.euiAccordion__buttonContent': {
      flexGrow: 1,
    },
  });
