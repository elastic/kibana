/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DEFAULT_PROMPTS } from '../../common/prompts';
import { selectSuggestedPrompts, useSuggestedPrompts } from './use_suggested_prompts';

describe('selectSuggestedPrompts', () => {
  it('returns the requested number of prompts', () => {
    expect(selectSuggestedPrompts(DEFAULT_PROMPTS, 4)).toHaveLength(4);
  });

  it('returns all prompts when count exceeds the list length', () => {
    expect(selectSuggestedPrompts(DEFAULT_PROMPTS, 100)).toHaveLength(DEFAULT_PROMPTS.length);
  });

  it('returns only prompts that exist in the source list', () => {
    const selected = selectSuggestedPrompts(DEFAULT_PROMPTS, 4);
    selected.forEach((p) => {
      expect(DEFAULT_PROMPTS).toContainEqual(p);
    });
  });

  it('returns no duplicates', () => {
    const selected = selectSuggestedPrompts(DEFAULT_PROMPTS, DEFAULT_PROMPTS.length);
    const ids = selected.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns an empty array when given an empty list', () => {
    expect(selectSuggestedPrompts([], 4)).toHaveLength(0);
  });
});

describe('useSuggestedPrompts', () => {
  it('returns exactly 4 prompts', () => {
    const { result } = renderHook(() => useSuggestedPrompts());
    expect(result.current).toHaveLength(4);
  });

  it('returns prompts that are all valid SuggestedPrompt objects', () => {
    const { result } = renderHook(() => useSuggestedPrompts());
    result.current.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('prompt');
    });
  });

  it('returns a stable list across re-renders', () => {
    const { result, rerender } = renderHook(() => useSuggestedPrompts());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
