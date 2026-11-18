/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MEMORY_LOG_PREVIEW_CHARS = 160;
export const MEMORY_LOG_PAGE_LIMIT = 25;

/** Compact a free-text field so debug lines stay readable in the step Logs panel. */
export const previewText = (value: string | undefined, max = MEMORY_LOG_PREVIEW_CHARS): string => {
  const compact = (value ?? '').replace(/\s+/g, ' ').trim();
  if (compact.length === 0) {
    return '(empty)';
  }
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max)}…`;
};

export const formatPageRefs = (
  pages: Array<{ id: string; title?: string }>,
  limit = MEMORY_LOG_PAGE_LIMIT
): string => {
  if (pages.length === 0) {
    return '(none)';
  }
  const shown = pages.slice(0, limit).map((page) => {
    const title = page.title ? ` "${previewText(page.title, 60)}"` : '';
    return `${page.id}${title}`;
  });
  const extra = pages.length > limit ? `, +${pages.length - limit} more` : '';
  return `${shown.join(', ')}${extra}`;
};
