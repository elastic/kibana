/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hard cap for a confirmed context-overflow retry. A larger middle rung was
 * previously listed but unused: every caller goes through this 30K budget, which
 * matches the prior safe prefix scale while keeping evenly distributed windows.
 */
export const OVERFLOW_RETRY_ARTICLE_CHAR_BUDGET = 30_000;
/** @deprecated Use OVERFLOW_RETRY_ARTICLE_CHAR_BUDGET; kept as an alias for tests. */
export const DEGRADED_ARTICLE_CHAR_BUDGET = OVERFLOW_RETRY_ARTICLE_CHAR_BUDGET;
const DISTRIBUTED_WINDOW_COUNT = 9;
/** Floor so a short forced-overflow budget still yields readable spans. */
const MIN_USEFUL_WINDOW_CHARS = 24;
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

const degradedPrefixContext = (text: string, budget: number): ArticleContext => {
  const selected = text.slice(0, Math.min(budget, Math.max(1, text.length - 1)));
  return {
    text: selected,
    mode: 'degraded_context',
    original_chars: text.length,
    selected_chars: selected.length,
    coverage: selected.length / text.length,
  };
};

/**
 * Evenly spaced verbatim windows that fit inside `budget` after omission
 * markers. Drops window count until each span is useful; returns undefined when
 * even two windows cannot fit (caller should use a prefix fallback).
 */
const selectFittingWindows = (text: string, budget: number): ArticleContext | undefined => {
  for (let count = DISTRIBUTED_WINDOW_COUNT; count >= 2; count--) {
    const separatorChars = OMISSION_MARKER.length * (count - 1);
    const sourceBudget = budget - separatorChars;
    if (sourceBudget >= MIN_USEFUL_WINDOW_CHARS * count) {
      const windowChars = Math.floor(sourceBudget / count);
      const maxStart = Math.max(0, text.length - windowChars);
      const windows: string[] = [];

      for (let index = 0; index < count; index++) {
        const start = index === count - 1 ? maxStart : Math.round((maxStart * index) / (count - 1));
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
    }
  }
  return undefined;
};

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
    return degradedPrefixContext(text, budget);
  }

  return selectFittingWindows(text, budget) ?? degradedPrefixContext(text, budget);
};

/** Context selection for a confirmed overflow retry: always reduce the source. */
export const selectOverflowRetryArticleContext = (text: string): ArticleContext =>
  selectDistributedArticleContext(text, OVERFLOW_RETRY_ARTICLE_CHAR_BUDGET, { force: true });

/**
 * Shrink an already-degraded overflow selection again while preserving the true
 * source length for coverage metadata. Used when the first reduced retry still
 * exceeds a small model window.
 */
export const furtherShrinkOverflowArticleContext = (context: ArticleContext): ArticleContext => {
  const originalChars = context.original_chars;
  const shrunk = selectOverflowRetryArticleContext(context.text);
  return {
    ...shrunk,
    original_chars: originalChars,
    coverage: originalChars > 0 ? shrunk.selected_chars / originalChars : 0,
  };
};
