/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToggleReducerAction, UseAccordionStateValue } from './use_accordion_state';
import { useAccordionState, toggleReducer } from './use_accordion_state';
import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';

const mockSet = jest.fn();

describe('useAccordionState', () => {
  let hookResult: RenderHookResult<UseAccordionStateValue, boolean>;

  it('should return initial value', () => {
    hookResult = renderHook((props: boolean) => useAccordionState(props), {
      initialProps: true,
    });

    expect(hookResult.result.current.renderContent).toBe(true);
    expect(hookResult.result.current.state).toBe('open');
  });
});

describe('toggleReducer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct state and pass values to localStorage', () => {
    const mockStorage = {
      get: jest.fn(),
      set: mockSet,
    };
    const mockLocalStorageKey = 'test';
    const mockAction = {
      storage: mockStorage,
      title: mockLocalStorageKey,
    } as unknown as ToggleReducerAction;
    const mockState = 'closed';

    const result = toggleReducer(mockState, mockAction);
    expect(result).toBe('open');
    expect(mockSet).toHaveBeenCalledWith(FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS, {
      [mockLocalStorageKey]: true,
    });
  });

  it(`should not pass values to localStorage if key isn't provided`, () => {
    const mockStorage = {
      get: jest.fn(),
      set: mockSet,
    };
    const mockAction = {
      storage: mockStorage,
    } as unknown as ToggleReducerAction;
    const mockState = 'open';

    const result = toggleReducer(mockState, mockAction);
    expect(result).toBe('closed');
    expect(mockSet).not.toHaveBeenCalled();
  });
});
