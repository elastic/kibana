/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useMovingAttacksCallout } from './use_moving_attacks_callout';

jest.mock('react-use/lib/useLocalStorage');
const mockLocalStorage = [true, jest.fn()];

describe('useMovingAttacksCallout', () => {
  beforeEach(() => {
    (useLocalStorage as jest.Mock).mockReturnValue(mockLocalStorage);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with true default value from local storage', () => {
    const { result } = renderHook(() => useMovingAttacksCallout());
    expect(result.current.isMovingAttacksCalloutVisible).toBe(true);
  });

  it('should update local storage when showMovingAttacksCallout is called', async () => {
    const { result } = renderHook(() => useMovingAttacksCallout());

    result.current.showMovingAttacksCallout();

    await waitFor(() => {
      expect(mockLocalStorage[1]).toHaveBeenCalledWith(true);
    });
  });

  it('should update local storage when hideMovingAttacksCallout is called', async () => {
    const { result } = renderHook(() => useMovingAttacksCallout());

    result.current.hideMovingAttacksCallout();

    await waitFor(() => {
      expect(mockLocalStorage[1]).toHaveBeenCalledWith(false);
    });
  });
});
