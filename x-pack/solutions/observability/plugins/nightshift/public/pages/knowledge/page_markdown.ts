/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Drops the leading heading that repeats the title the view already shows. */
export const contentWithoutDuplicateTitle = (title: string, content: string): string =>
  content.replace(new RegExp(`^#{1,3}\\s*${escapeRegExp(title)}\\s*\\n+`, 'i'), '');

/** Inline code reads as part of the sentence; only fenced blocks get the chip. */
export const pageMarkdownCss = css`
  .euiMarkdownFormat :not(pre) > code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
  }
`;
