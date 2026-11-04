/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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
      ruleBasedSourceIds: undefined,
      indexSourceWithMissingApiKey: undefined,
    });
  });

  it('passes the watchlist id through unchanged', () => {
    const { result } = renderHook(() => useEditWatchlistFormState({ watchlistId: 'wl-1' }));

    expect(mockUseGetWatchlistFormData).toHaveBeenCalledWith('wl-1');
    expect(result.current.watchlistId).toBe('wl-1');
    expect(result.current.isEditMode).toBe(true);
  });

  it('disables save when the id is missing', () => {
    const { result } = renderHook(() => useEditWatchlistFormState({}));

    expect(result.current.watchlistId).toBeUndefined();
    expect(result.current.isDisabled).toBe(true);
  });
});
