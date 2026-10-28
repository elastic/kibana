/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

const gridStyles = (columns: number) => css`
  display: grid;
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
`;

export const sourceGridStyles = gridStyles(2);

export const sourceGridThreeColumnsStyles = gridStyles(3);
