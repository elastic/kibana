/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

// TODO check font Roboto Mono
export const nestedGroupSpaceCss = css`
  margin-left: ${euiThemeVars.euiSizeXL};
  margin-bottom: ${euiThemeVars.euiSizeXS};
  padding-top: ${euiThemeVars.euiSizeXS};
`;

export const valueContainerCss = css`
  display: flex;
  align-items: center;
  margin-left: ${euiThemeVars.euiSizeS};
`;
export const expressionContainerCss = css`
  display: flex;
  align-items: center;
`;
