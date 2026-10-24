/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useVisibleColumns } from './use_visible_columns';

const STORAGE_KEY = 'test.visibleColumns';

const COLUMN_IDS = ['lcp', 'fcp', 'ttfb'] as const;

const HIDDEN_BY_DEFAULT = ['fcp', 'ttfb'] as const;

const renderColumns = () =>
  renderHook(() =>
    useVisibleColumns({
      storageKey: STORAGE_KEY,
      columnIds: COLUMN_IDS,
      hiddenByDefault: HIDDEN_BY_DEFAULT,
    })
  );

describe('useVisibleColumns', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows every column but the hidden ones by default', () => {
    expect([...renderColumns().result.current.visibleColumns]).toEqual(['lcp']);
  });

  it('keeps the chosen columns across renders and in local storage', () => {
    const { result } = renderColumns();

    act(() => result.current.setVisibleColumns(['lcp', 'ttfb']));

    expect([...result.current.visibleColumns]).toEqual(['lcp', 'ttfb']);
    expect([...renderColumns().result.current.visibleColumns]).toEqual(['lcp', 'ttfb']);
  });

  it('ignores saved columns that no longer exist', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['lcp', 'removed']));

    expect([...renderColumns().result.current.visibleColumns]).toEqual(['lcp']);
  });
});
