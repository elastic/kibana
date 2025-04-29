/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

export const patternAccordionCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  '.euiAccordion__triggerWrapper': {
    padding: `14px ${euiTheme.size.base}`,
    border: `1px solid ${euiTheme.border.color}`,
    borderRadius: euiTheme.border.radius.medium,
  },
  '.euiAccordion__button:is(:hover, :focus)': {
    textDecoration: 'none',
  },
  '.euiAccordion__buttonContent': {
    flexGrow: 1,
  },
});

export const patternAccordionChildrenCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  padding: euiTheme.size.s,
  paddingBottom: 0,
  border: `1px solid ${euiTheme.border.color}`,
  borderRadius: `0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium}`,
  borderTop: 'none',
  width: `calc(100% - ${euiTheme.size.s} * 2)`,
  margin: 'auto',
});
