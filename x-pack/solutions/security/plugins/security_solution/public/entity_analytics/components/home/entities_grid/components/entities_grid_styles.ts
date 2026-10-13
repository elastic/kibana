/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/** A row of the grid: as wide as its cells, and at least as wide as the grid. */
export const gridRowCss = css`
  inline-size: fit-content;
  min-inline-size: 100%;
`;

/** The cells of a row, side by side. */
export const gridRowCellsCss = css`
  display: flex;
`;
