/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';
import { CSSObject, css } from '@emotion/react';

export const optionCss = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
});

export const optionLabelCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  fontWeight: euiTheme.font.weight.bold,
});

export const formControlLayoutCss = css({
  height: 42,
  '.euiFormControlLayout__childrenWrapper': {
    overflow: 'visible',
  },
});
