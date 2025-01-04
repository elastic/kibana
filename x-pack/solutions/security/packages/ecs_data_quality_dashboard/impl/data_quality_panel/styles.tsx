/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';

import { SerializedStyles, css } from '@emotion/react';

export const codeDangerCss = ({ euiTheme }: UseEuiTheme): SerializedStyles =>
  css({
    color: euiTheme.colors.danger,
  });

export const codeSuccessCss = ({ euiTheme }: UseEuiTheme): SerializedStyles =>
  css({
    color: euiTheme.colors.success,
  });
