/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import {
  useTemplatesUrlSearchState,
  DEFAULT_STATE,
  SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY,
} from './use_templates_url_search_state';

const mockUrlGet = jest.fn();
const mockUrlSet = jest.fn();
const mockUrlChange$ = jest.fn(() => ({ subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) }));

jest.mock('@kbn/kibana-utils-plugin/public', () => ({
  createKbnUrlStateStorage: jest.fn(() => ({
    get: mockUrlGet,
    set: mockUrlSet,
    change$: mockUrlChange$,
  })),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn(),
    location: { pathname: '/management/templates', search: '', hash: '' },
    listen: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('useTemplatesUrlSearchState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlGet.mockReturnValue(null);
  });

  it('initializes with DEFAULT_STATE when URL has no state', () => {
    const { result } = renderHook(() => useTemplatesUrlSearchState());

    expect(result.current.state).toEqual(DEFAULT_STATE);
  });

  it('initializes with URL state when present', () => {
    const urlState = { search: 'nginx', tags: ['production'], page: 2, perPage: 50 };
    mockUrlGet.mockReturnValue(urlState);

    const { result } = renderHook(() => useTemplatesUrlSearchState());

    expect(result.current.state).toEqual(urlState);
  });

  it('updates state and syncs to URL on onStateChange', () => {
    const { result } = renderHook(() => useTemplatesUrlSearchState());

    act(() => {
      result.current.onStateChange({ search: 'test query' });
    });

    expect(result.current.state.search).toBe('test query');
    expect(mockUrlSet).toHaveBeenCalledWith(
      SLO_TEMPLATES_SEARCH_URL_STORAGE_KEY,
      expect.objectContaining({ search: 'test query', page: 0 }),
      { replace: true }
    );
  });

  it('resets page to 0 on state change', () => {
    const { result } = renderHook(() => useTemplatesUrlSearchState());

    act(() => {
      result.current.onStateChange({ page: 3 });
    });
    act(() => {
      result.current.onStateChange({ search: 'new search' });
    });

    expect(result.current.state.page).toBe(0);
  });

  it('preserves previous state fields when partially updating', () => {
    const { result } = renderHook(() => useTemplatesUrlSearchState());

    act(() => {
      result.current.onStateChange({ search: 'nginx' });
    });
    act(() => {
      result.current.onStateChange({ tags: ['production'] });
    });

    expect(result.current.state.search).toBe('nginx');
    expect(result.current.state.tags).toEqual(['production']);
  });

  it('handles rapid successive calls without stale state', () => {
    const { result } = renderHook(() => useTemplatesUrlSearchState());

    act(() => {
      result.current.onStateChange({ search: 'first' });
      result.current.onStateChange({ tags: ['alpha'] });
    });

    expect(result.current.state.search).toBe('first');
    expect(result.current.state.tags).toEqual(['alpha']);

    expect(mockUrlSet).toHaveBeenCalledTimes(2);
    const lastCall = mockUrlSet.mock.calls[1][1];
    expect(lastCall.search).toBe('first');
    expect(lastCall.tags).toEqual(['alpha']);
  });
});
