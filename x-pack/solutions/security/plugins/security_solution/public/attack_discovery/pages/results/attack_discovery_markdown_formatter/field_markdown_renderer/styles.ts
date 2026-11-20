/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const inlineFieldWrapperCss = css`
  display: inline-block;
  vertical-align: middle;

  .euiBadge {
    vertical-align: middle;
  }
`;

/** Constrains long chip labels (UUIDs, hashes) to a readable width.
 *  10rem keeps the value theme-relative (scales with the root font size). */
export const chipLabelCss = css`
  display: inline-block;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
`;

/** Wraps long chip labels instead of clipping them, for narrow containers like chat cards. */
export const wrappedChipLabelCss = css`
  display: inline;
  overflow-wrap: anywhere;
  vertical-align: middle;
  white-space: normal;
`;
