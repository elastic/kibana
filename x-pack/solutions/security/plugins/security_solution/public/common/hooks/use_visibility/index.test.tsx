/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useVisibility } from '.';

describe('useVisibility', () => {
  let initialState: boolean;
  let onOpen: jest.Mock;
  let onClose: jest.Mock;

  beforeEach(() => {
    initialState = false;
    onOpen = jest.fn();
    onClose = jest.fn();
  });

  it('should initialize with the correct state', () => {
    const { result } = renderHook(() => useVisibility(initialState, { onOpen, onClose }));
    expect(result.current[0]).toBe(initialState);
  });

  it('should call onOpen when opening visibility', () => {
    const { result } = renderHook(() => useVisibility(initialState, { onOpen, onClose }));
    act(() => {
      result.current[1](); // Call open
    });
    expect(result.current[0]).toBe(true);
    expect(onOpen).toHaveBeenCalled();
  });

  it('should call onClose when closing visibility', () => {
    const { result } = renderHook(() => useVisibility(true, { onOpen, onClose }));
    act(() => {
      result.current[2](); // Call close
    });
    expect(result.current[0]).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });
});
