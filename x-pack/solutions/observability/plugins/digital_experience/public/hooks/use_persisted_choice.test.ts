/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { usePersistedChoice } from './use_persisted_choice';

const KEY = 'xpack.digitalExperience.test.choice';
const ALLOWED = ['area', 'bar'] as const;

const render = () => renderHook(() => usePersistedChoice(KEY, ALLOWED, 'area'));
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');

beforeEach(() => localStorage.clear());

describe('usePersistedChoice', () => {
  it('is the fallback until a choice is made', () => {
    const { result } = render();

    expect(result.current[0]).toBe('area');
  });

  it('keeps a choice in the local storage and across visits', () => {
    const first = render();
    act(() => first.result.current[1]('bar'));

    expect(first.result.current[0]).toBe('bar');
    expect(stored()).toBe('bar');

    first.unmount();
    expect(render().result.current[0]).toBe('bar');
  });

  it('falls back for anything else in the storage', () => {
    localStorage.setItem(KEY, JSON.stringify('pie'));

    expect(render().result.current[0]).toBe('area');
  });

  it('ignores a choice that is not allowed', () => {
    const { result } = render();

    act(() => result.current[1]('pie'));

    expect(result.current[0]).toBe('area');
    expect(stored()).toBe('area');
  });
});
