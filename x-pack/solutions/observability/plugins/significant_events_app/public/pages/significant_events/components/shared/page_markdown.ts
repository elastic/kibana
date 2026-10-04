/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The body of a written page, without the heading that repeats its title.
 *
 * Every page is authored with its own name as the first heading, and the view
 * already shows the title above it, so the same words would open the body twice.
 */
export const contentWithoutDuplicateTitle = (title: string, content: string): string =>
  content.replace(new RegExp(`^#{1,3}\\s*${escapeRegExp(title)}\\s*\\n+`, 'i'), '');

/**
 * Inline code inside a page reads as part of the sentence; only fenced blocks
 * get the chip-like treatment. One definition, because it reaches into the
 * rendered markdown and two copies could drift apart silently.
 */
export const pageMarkdownCss = css`
  .euiMarkdownFormat :not(pre) > code {
    background: transparent;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
  }
`;
