/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, cx } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';

const CONTAINER_BREAKPOINT = 500;

export const mainContainer = css`
  container-type: inline-size;
`;

const baseStyle = css`
  flex-basis: 100%;
`;

export const dropdownContainer = cx(
  baseStyle,
  css`
    @container (min-width: ${CONTAINER_BREAKPOINT}px) {
      flex: 1;
      min-width: 0; /* Allows the dropdown to shrink */
    }
  `
);

export const operatorContainer = cx(
  baseStyle,
  css`
    justify-content: center;
    text-align: center;

    @container (min-width: ${CONTAINER_BREAKPOINT}px) {
      margin-top: ${euiThemeVars.euiSizeXL};
      justify-content: flex-start;
      flex: 0 0 auto;
    }
  `
);

export const input = cx(
  baseStyle,
  css`
    @container (min-width: ${CONTAINER_BREAKPOINT}px) {
      flex: 0 0 150px;
    }
  `
);

export const fieldSection = css`
  gap: ${euiThemeVars.euiSizeS};
  flex-wrap: wrap;

  @container (min-width: ${CONTAINER_BREAKPOINT}px) {
    flex-wrap: nowrap;
    gap: ${euiThemeVars.euiSizeL};
  }
`;
