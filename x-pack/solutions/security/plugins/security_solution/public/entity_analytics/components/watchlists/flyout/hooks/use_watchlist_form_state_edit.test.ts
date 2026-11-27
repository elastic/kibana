/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useEditWatchlistFormState } from './use_watchlist_form_state_edit';
import { useGetWatchlistFormData } from './use_get_watchlist_form_data';

jest.mock('./use_get_watchlist_form_data', () => ({
  useGetWatchlistFormData: jest.fn(),
}));

jest.mock('./use_rule_based_source_state', () => ({
  useRuleBasedSourceState: () => ({ isValid: true, isValidatingTimestamp: false }),
}));

const mockUseGetWatchlistFormData = useGetWatchlistFormData as jest.Mock;

describe('useEditWatchlistFormState', () => {
  beforeEach(() => {
    mockUseGetWatchlistFormData.mockReturnValue({
      initialWatchlist: undefined,
      indexSourceWithMissingApiKey: undefined,
    });
  });

  it('passes the watchlist id through unchanged', () => {
    const { result } = renderHook(() => useEditWatchlistFormState({ watchlistId: 'wl-1' }));

    expect(mockUseGetWatchlistFormData).toHaveBeenCalledWith('wl-1');
    expect(result.current.watchlistId).toBe('wl-1');
    expect(result.current.isEditMode).toBe(true);
  });

  it('reports whether the data sources differ from the ones that were loaded', () => {
    mockUseGetWatchlistFormData.mockReturnValue({
      initialWatchlist: {
        name: 'wl',
        riskModifier: 1,
        managed: false,
        entitySources: [{ type: 'store', name: 'wl-store', queryRule: 'a: b' }],
      },
      indexSourceWithMissingApiKey: undefined,
    });
    const { result } = renderHook(() => useEditWatchlistFormState({ watchlistId: 'wl-1' }));

    act(() => result.current.setWatchlistField('name', 'renamed'));
    expect(result.current.hasEntitySourceChanges).toBe(false);

    act(() => result.current.setWatchlistField('entitySources', []));
    expect(result.current.hasEntitySourceChanges).toBe(true);
  });

  it('disables save when the id is missing', () => {
    const { result } = renderHook(() => useEditWatchlistFormState({}));

    expect(result.current.watchlistId).toBeUndefined();
    expect(result.current.isDisabled).toBe(true);
  });
});
