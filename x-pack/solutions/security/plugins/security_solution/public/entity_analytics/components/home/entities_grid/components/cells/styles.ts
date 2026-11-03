/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const ellipsisCss = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

/** EUI's cell content box is a flex row, so the cell must fill it for `text-align` to have room to move. */
export const alignEndCss = css`
  inline-size: 100%;
  text-align: end;
`;
