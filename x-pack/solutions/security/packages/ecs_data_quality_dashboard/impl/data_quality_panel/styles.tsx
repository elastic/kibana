/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';

import { CSSObject } from '@emotion/react';

export const codeDangerCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  color: euiTheme.colors.danger,
});

export const codeSuccessCss = ({ euiTheme }: UseEuiTheme): CSSObject => ({
  color: euiTheme.colors.success,
});
