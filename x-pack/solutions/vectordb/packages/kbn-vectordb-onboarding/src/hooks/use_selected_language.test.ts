/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useSelectedLanguage } from './use_selected_language';
import { ONBOARDING_LANGUAGE_STORAGE_KEY } from '../storage_keys';

beforeEach(() => {
  localStorage.clear();
});

describe('useSelectedLanguage', () => {
  it('defaults to Python when nothing is stored', () => {
    const { result } = renderHook(() => useSelectedLanguage());

    expect(result.current[0]).toBe('python');
  });

  it('reads the stored language on mount', () => {
    localStorage.setItem(ONBOARDING_LANGUAGE_STORAGE_KEY, 'go');

    const { result } = renderHook(() => useSelectedLanguage());

    expect(result.current[0]).toBe('go');
  });

  it('updates state and persists the selection', () => {
    const { result } = renderHook(() => useSelectedLanguage());

    act(() => {
      result.current[1]('ruby');
    });

    expect(result.current[0]).toBe('ruby');
    expect(localStorage.getItem(ONBOARDING_LANGUAGE_STORAGE_KEY)).toBe('ruby');
  });

  it('returns the persisted selection to a later mount', () => {
    const { result, unmount } = renderHook(() => useSelectedLanguage());

    act(() => {
      result.current[1]('java');
    });
    unmount();

    const { result: remounted } = renderHook(() => useSelectedLanguage());

    expect(remounted.current[0]).toBe('java');
  });

  it('falls back to the default when the stored language is not supported', () => {
    localStorage.setItem(ONBOARDING_LANGUAGE_STORAGE_KEY, 'cobol');

    const { result } = renderHook(() => useSelectedLanguage());

    expect(result.current[0]).toBe('python');
  });

  it('falls back to the default when storage cannot be read', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const { result } = renderHook(() => useSelectedLanguage());

    expect(result.current[0]).toBe('python');

    getItemSpy.mockRestore();
  });

  it('keeps the selection in memory when storage cannot be written', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });
    const { result } = renderHook(() => useSelectedLanguage());

    expect(() => {
      act(() => {
        result.current[1]('rust');
      });
    }).not.toThrow();
    expect(result.current[0]).toBe('rust');

    setItemSpy.mockRestore();
  });
});
