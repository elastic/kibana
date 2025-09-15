/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useIsOpenState } from './use_is_open_state';

describe('useIsOpenState', () => {
  let initialState: boolean;
  let onOpen: jest.Mock;
  let onClose: jest.Mock;
  let onToggle: jest.Mock;

  beforeEach(() => {
    initialState = false;
    onOpen = jest.fn();
    onClose = jest.fn();
    onToggle = jest.fn();
  });

  it('should initialize with the correct state', () => {
    const { result } = renderHook(() => useIsOpenState(initialState));
    expect(result.current.isOpen).toBe(initialState);
  });

  it('should call onOpen when opening', () => {
    const { result } = renderHook(() => useIsOpenState(initialState, { onOpen }));
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    expect(onOpen).toHaveBeenCalled();
  });

  it('should call onClose when closing', () => {
    const { result } = renderHook(() => useIsOpenState(true, { onClose }));
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onToggle when toggling', () => {
    const { result } = renderHook(() => useIsOpenState(true, { onToggle }));
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
    expect(onToggle).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
