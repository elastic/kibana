/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSObject } from '@emotion/react';
import {
  PND_PAGE_CONTENT_MAX_WIDTH,
  PND_PAGE_CONTENT_MAX_WIDTH_WIDE,
  PND_PAGE_WIDE_MIN_WIDTH,
} from '../../constants';

/**
 * The centered main column every PND page section composes from, ported from
 * the Daybreak prototype's `overviewMainColumnStyles` at `10e153f`.
 *
 * The column is capped rather than fluid so line lengths stay readable, and it
 * widens once the viewport is big enough that the cap would leave the page
 * looking empty.
 */
export const getPageColumnStyles = (): CSSObject => ({
  boxSizing: 'border-box',
  marginInline: 'auto',
  maxWidth: PND_PAGE_CONTENT_MAX_WIDTH,
  width: '100%',
  [`@media (min-width: ${PND_PAGE_WIDE_MIN_WIDTH}px)`]: {
    maxWidth: PND_PAGE_CONTENT_MAX_WIDTH_WIDE,
  },
});
