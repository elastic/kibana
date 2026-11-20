/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { ANALYTICS_PREFERENCES_STORAGE_KEY } from '../constants';
import { storePreferredJourney, useAnalyticsPreferences } from './use_analytics_preferences';

const failStorage = (): (() => void) => {
  const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage unavailable');
  });
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage unavailable');
  });
  return () => {
    getItem.mockRestore();
    setItem.mockRestore();
  };
};

describe('useAnalyticsPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no use case', () => {
    const { result } = renderHook(() => useAnalyticsPreferences());

    expect(result.current.selectedUseCaseId).toBeUndefined();
  });

  it('keeps the selected use case across mounts', () => {
    const first = renderHook(() => useAnalyticsPreferences());

    act(() => first.result.current.selectUseCase('gaming'));
    first.unmount();
    const second = renderHook(() => useAnalyticsPreferences());

    expect(second.result.current.selectedUseCaseId).toBe('gaming');
    expect(localStorage.getItem(ANALYTICS_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({ selectedUseCaseId: 'gaming' })
    );
  });

  it('shares the selection between hooks on the same page', () => {
    const first = renderHook(() => useAnalyticsPreferences());
    const second = renderHook(() => useAnalyticsPreferences());

    act(() => first.result.current.selectUseCase('adtech'));

    expect(second.result.current.selectedUseCaseId).toBe('adtech');
  });

  it('ignores a stored use case it does not recognise', () => {
    localStorage.setItem(
      ANALYTICS_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ selectedUseCaseId: 'nope' })
    );

    const { result } = renderHook(() => useAnalyticsPreferences());

    expect(result.current.selectedUseCaseId).toBeUndefined();
  });

  it.each(['{not json', 'null', '"text"'])('starts empty when the stored value is %s', (raw) => {
    localStorage.setItem(ANALYTICS_PREFERENCES_STORAGE_KEY, raw);

    const { result } = renderHook(() => useAnalyticsPreferences());

    expect(result.current.selectedUseCaseId).toBeUndefined();
  });

  it('keeps the selection in memory when storage throws', () => {
    const restoreStorage = failStorage();
    const { result } = renderHook(() => useAnalyticsPreferences());

    act(() => result.current.selectUseCase('iot'));

    expect(result.current.selectedUseCaseId).toBe('iot');
    restoreStorage();
  });
});

describe('preferred journey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no journey and keeps the picked one across mounts', () => {
    const first = renderHook(() => useAnalyticsPreferences());
    expect(first.result.current.preferredJourney).toBeUndefined();

    act(() => first.result.current.setPreferredJourney('search'));
    first.unmount();

    expect(renderHook(() => useAnalyticsPreferences()).result.current.preferredJourney).toBe(
      'search'
    );
  });

  it('keeps the journey and the use case independent of each other', () => {
    const { result } = renderHook(() => useAnalyticsPreferences());

    act(() => result.current.selectUseCase('gaming'));
    act(() => result.current.setPreferredJourney('analytics'));
    act(() => result.current.selectUseCase('iot'));

    expect(result.current.preferredJourney).toBe('analytics');
    expect(result.current.selectedUseCaseId).toBe('iot');
    expect(localStorage.getItem(ANALYTICS_PREFERENCES_STORAGE_KEY)).toBe(
      JSON.stringify({ selectedUseCaseId: 'iot', preferredJourney: 'analytics' })
    );
  });

  it('can be stored outside a component, and reaches mounted hooks', () => {
    const { result } = renderHook(() => useAnalyticsPreferences());

    act(() => storePreferredJourney('analytics'));

    expect(result.current.preferredJourney).toBe('analytics');
  });

  it('ignores a stored journey it does not recognise', () => {
    localStorage.setItem(
      ANALYTICS_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ preferredJourney: 'mixed' })
    );

    expect(
      renderHook(() => useAnalyticsPreferences()).result.current.preferredJourney
    ).toBeUndefined();
  });

  it('keeps the journey in memory when storage throws', () => {
    const restoreStorage = failStorage();
    const { result } = renderHook(() => useAnalyticsPreferences());

    act(() => result.current.setPreferredJourney('search'));

    expect(result.current.preferredJourney).toBe('search');
    restoreStorage();
  });
});
