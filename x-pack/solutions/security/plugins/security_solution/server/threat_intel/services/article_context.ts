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

export interface SelectDistributedArticleContextOptions {
  /**
   * When true, always return a strictly smaller selection than `text`, even if
   * `text.length` is already under `maxChars`. Used after a confirmed context
   * overflow so the retry cannot resubmit the identical prompt (token-dense
   * sources and smaller model windows overflow well below the char budget).
   */
  force?: boolean;
}

export const fullArticleContext = (text: string): ArticleContext => ({
  text,
  mode: 'full',
  original_chars: text.length,
  selected_chars: text.length,
  coverage: 1,
});

const shrinkBudget = (textLength: number, maxChars: number): number =>
  Math.min(maxChars, Math.max(1, Math.floor(textLength / 2)));

/**
 * Selects evenly distributed, verbatim windows from the whole source. There is
 * deliberately no semantic ranking: early, middle, and late evidence receive
 * equal opportunity to reach the model when the full source exceeds context.
 */
export const selectDistributedArticleContext = (
  text: string,
  maxChars = DEGRADED_ARTICLE_CHAR_BUDGET,
  options?: SelectDistributedArticleContextOptions
): ArticleContext => {
  if (text.length === 0) return fullArticleContext(text);

  const budget = options?.force ? shrinkBudget(text.length, maxChars) : maxChars;
  if (!options?.force && text.length <= budget) return fullArticleContext(text);

  if (text.length <= budget) {
    // Forced shrink on a source already under the char budget: keep a strict
    // prefix so the overflow retry cannot resubmit the identical prompt.
    const selected = text.slice(0, budget);
    return {
      text: selected,
      mode: 'degraded_context',
      original_chars: text.length,
      selected_chars: selected.length,
      coverage: selected.length / text.length,
    };
  }

  const separatorChars = OMISSION_MARKER.length * (DISTRIBUTED_WINDOW_COUNT - 1);
  const sourceBudget = Math.max(DISTRIBUTED_WINDOW_COUNT, budget - separatorChars);
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

/** Context selection for a confirmed overflow retry: always reduce the source. */
export const selectOverflowRetryArticleContext = (text: string): ArticleContext =>
  selectDistributedArticleContext(text, DEGRADED_ARTICLE_CHAR_BUDGET, { force: true });
