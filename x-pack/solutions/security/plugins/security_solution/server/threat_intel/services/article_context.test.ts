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
  fullArticleContext,
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
