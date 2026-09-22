/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEGRADED_ARTICLE_CHAR_BUDGET = 240_000;
const DISTRIBUTED_WINDOW_COUNT = 9;
const OMISSION_MARKER = '\n\n[... source text omitted for context capacity ...]\n\n';

export interface ArticleContext {
  text: string;
  mode: 'full' | 'degraded_context';
  original_chars: number;
  selected_chars: number;
  coverage: number;
}

export const fullArticleContext = (text: string): ArticleContext => ({
  text,
  mode: 'full',
  original_chars: text.length,
  selected_chars: text.length,
  coverage: 1,
});

/**
 * Selects evenly distributed, verbatim windows from the whole source. There is
 * deliberately no semantic ranking: early, middle, and late evidence receive
 * equal opportunity to reach the model when the full source exceeds context.
 */
export const selectDistributedArticleContext = (
  text: string,
  maxChars = DEGRADED_ARTICLE_CHAR_BUDGET
): ArticleContext => {
  if (text.length <= maxChars) return fullArticleContext(text);

  const separatorChars = OMISSION_MARKER.length * (DISTRIBUTED_WINDOW_COUNT - 1);
  const sourceBudget = Math.max(DISTRIBUTED_WINDOW_COUNT, maxChars - separatorChars);
  const windowChars = Math.max(1, Math.floor(sourceBudget / DISTRIBUTED_WINDOW_COUNT));
  const maxStart = text.length - windowChars;
  const windows: string[] = [];

  for (let index = 0; index < DISTRIBUTED_WINDOW_COUNT; index++) {
    const start =
      index === DISTRIBUTED_WINDOW_COUNT - 1
        ? maxStart
        : Math.round((maxStart * index) / (DISTRIBUTED_WINDOW_COUNT - 1));
    windows.push(text.slice(start, start + windowChars));
  }

  const selectedChars = windows.reduce((sum, window) => sum + window.length, 0);
  return {
    text: windows.join(OMISSION_MARKER),
    mode: 'degraded_context',
    original_chars: text.length,
    selected_chars: selectedChars,
    coverage: selectedChars / text.length,
  };
};

export const isContextLengthError = (error: unknown): boolean => {
  const value = error as { code?: unknown; message?: unknown };
  return (
    value?.code === 'contextLengthExceededError' ||
    (typeof value?.message === 'string' &&
      /context (?:length|window)|too many (?:input )?tokens|maximum context/i.test(value.message))
  );
};
