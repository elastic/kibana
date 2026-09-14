/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

// Reading-width cap for the source-error callout; not an EUI spacing or breakpoint token.
export const ERROR_CALLOUT_MAX_WIDTH = '42em';

// Pin AppHeader; `isEmptyState` would center the header with the body.
export const filledPageSectionContentCss = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
`;
