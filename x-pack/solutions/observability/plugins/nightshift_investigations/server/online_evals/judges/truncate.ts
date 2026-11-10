/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Cuts text to `maxChars` and appends a marker with the number of characters cut. */
export const truncate = (text: string, maxChars: number): string =>
  text.length > maxChars
    ? `${text.slice(0, maxChars)}\n[truncated ${text.length - maxChars} characters]`
    : text;
