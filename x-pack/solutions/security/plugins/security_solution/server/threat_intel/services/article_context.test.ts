/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompletionErrorCode,
  InferenceTaskError,
  isContextLengthExceededError,
} from '@kbn/inference-common';
import {
  OVERFLOW_RETRY_ARTICLE_CHAR_BUDGET,
  fullArticleContext,
  furtherShrinkOverflowArticleContext,
  selectDistributedArticleContext,
  selectOverflowRetryArticleContext,
} from './article_context';

describe('article context selection', () => {
  it('keeps the complete source when it fits', () => {
    expect(selectDistributedArticleContext('complete source', 100)).toEqual(
      fullArticleContext('complete source')
    );
  });

  it('covers the beginning, middle, and end without ranking blocks', () => {
    const text = Array.from({ length: 1_000 }, (_, index) => String(index).padStart(4, '0')).join(
      '|'
    );
    const selected = selectDistributedArticleContext(text, 1_000);

    expect(selected.mode).toBe('degraded_context');
    expect(selected.coverage).toBeGreaterThan(0);
    expect(selected.coverage).toBeLessThan(1);
    expect(selected.text).toContain(text.slice(0, 20));
    expect(selected.text).toContain(text.slice(-20));
    expect(selected.text).toContain(
      text.slice(Math.floor(text.length / 2), Math.floor(text.length / 2) + 10)
    );
  });

  it('shrinks a under-budget source on overflow retry so the prompt cannot repeat', () => {
    const text = 'token-dense source that already overflowed once '.repeat(20);
    const selected = selectOverflowRetryArticleContext(text);

    expect(selected.mode).toBe('degraded_context');
    expect(selected.text.length).toBeLessThan(text.length);
    expect(selected.text).not.toBe(text);
    expect(selected.original_chars).toBe(text.length);
  });

  it('keeps usable windows on a short forced overflow instead of nine one-char spans', () => {
    const text = `START_${'m'.repeat(280)}_MIDDLE_${'n'.repeat(280)}_END`;
    const selected = selectOverflowRetryArticleContext(text);

    expect(selected.mode).toBe('degraded_context');
    expect(selected.text.length).toBeLessThan(text.length);
    expect(selected.text.length).toBeLessThanOrEqual(Math.floor(text.length / 2));
    // Each retained window must be readable, not a single character around a marker.
    const windows = selected.text.split(
      '\n\n[... source text omitted for context capacity ...]\n\n'
    );
    expect(windows.length).toBeGreaterThanOrEqual(2);
    expect(windows.every((window) => window.length >= 24)).toBe(true);
    expect(selected.text).toContain('START_');
    expect(selected.text).toContain('_END');
  });

  it('falls back to a prefix when omission markers cannot fit a useful window set', () => {
    const text = 'x'.repeat(80);
    const selected = selectOverflowRetryArticleContext(text);

    expect(selected.mode).toBe('degraded_context');
    expect(selected.text).toBe(text.slice(0, 40));
    expect(selected.text).not.toContain('omitted for context capacity');
  });

  it('caps a long overflow retry at the 30K overflow budget', () => {
    // Balanced padding so the distributed middle window lands on the marker.
    const text = `${'L'.repeat(200_000)}MIDDLE_EVIDENCE${'R'.repeat(200_000)}`;
    const selected = selectOverflowRetryArticleContext(text);

    expect(selected.mode).toBe('degraded_context');
    expect(selected.text.length).toBeLessThanOrEqual(OVERFLOW_RETRY_ARTICLE_CHAR_BUDGET);
    expect(selected.text).toContain('MIDDLE_EVIDENCE');
    expect(selected.original_chars).toBe(text.length);
  });

  it('further shrinks an already-degraded overflow selection without losing source length', () => {
    const text = 'y'.repeat(80_000);
    const first = selectOverflowRetryArticleContext(text);
    const second = furtherShrinkOverflowArticleContext(first);

    expect(second.text.length).toBeLessThan(first.text.length);
    expect(second.original_chars).toBe(text.length);
    expect(second.coverage).toBeLessThan(first.coverage);
  });

  it('recognizes typed context-limit errors', () => {
    expect(
      isContextLengthExceededError(
        new InferenceTaskError(
          ChatCompletionErrorCode.ContextLengthExceededError,
          'maximum context window exceeded',
          {}
        )
      )
    ).toBe(true);
    expect(isContextLengthExceededError(new Error('model unavailable'))).toBe(false);
  });
});
