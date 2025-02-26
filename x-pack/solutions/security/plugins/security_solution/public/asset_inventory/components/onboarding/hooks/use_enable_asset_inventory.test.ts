/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useEnableAssetInventory } from './use_enable_asset_inventory';
import { useMutation } from '@tanstack/react-query';
import { useAssetInventoryRoutes } from '../../../hooks/use_asset_inventory_routes';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
}));

jest.mock('../../../hooks/use_asset_inventory_routes', () => ({
  useAssetInventoryRoutes: jest.fn(),
}));

describe('useEnableAssetInventory', () => {
  let refetchStatusFn: jest.Mock;
  let postEnableAssetInventory: jest.Mock;

  beforeEach(() => {
    refetchStatusFn = jest.fn();
    postEnableAssetInventory = jest.fn();

    (useAssetInventoryRoutes as jest.Mock).mockReturnValue({
      postEnableAssetInventory,
    });

    (useMutation as jest.Mock).mockImplementation((_fn, options) => ({
      mutate: () => {
        try {
          options.onMutate?.();
          postEnableAssetInventory.mockResolvedValue({});
          options.onSuccess?.();
        } catch (error) {
          options.onError?.(error);
        }
      },
    }));
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useEnableAssetInventory(refetchStatusFn));

    expect(result.current.isEnabling).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set isEnabling to true on mutation start', () => {
    const { result } = renderHook(() => useEnableAssetInventory(refetchStatusFn));

    act(() => {
      result.current.handleEnableClick();
    });

    expect(result.current.isEnabling).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should call refetchStatusFn on success', async () => {
    const { result } = renderHook(() => useEnableAssetInventory(refetchStatusFn));

    act(() => {
      result.current.handleEnableClick();
    });

    expect(refetchStatusFn).toHaveBeenCalled();
  });

  it('should handle errors and update the error state', async () => {
    (useMutation as jest.Mock).mockImplementation((_fn, options) => ({
      mutate: () => {
        options.onMutate?.();
        options.onError?.({ body: { message: 'Server error' } });
      },
    }));

    const { result } = renderHook(() => useEnableAssetInventory(refetchStatusFn));

    act(() => {
      result.current.handleEnableClick();
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.isEnabling).toBe(false);
  });
});
