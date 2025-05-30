/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useEnableAssetInventory } from './use_enable_asset_inventory';
import { createTestProviderWrapper } from '../../../test/test_provider';
import { mockUseOnboardingSuccessCallout } from './use_onboarding_success_callout.mock';

const mockPostEnableAssetInventory = jest.fn();
const mockRefetchStatus = jest.fn();
const mockShowOnboardingSuccessCallout = jest.fn();

jest.mock('../../../hooks/use_asset_inventory_routes', () => ({
  useAssetInventoryRoutes: () => ({
    postEnableAssetInventory: mockPostEnableAssetInventory,
  }),
}));

jest.mock('../../../hooks/use_asset_inventory_status', () => ({
  useAssetInventoryStatus: () => ({
    refetch: mockRefetchStatus,
  }),
}));

jest.mock('./use_onboarding_success_callout', () => ({
  useOnboardingSuccessCallout: () =>
    mockUseOnboardingSuccessCallout({
      showOnboardingSuccessCallout: mockShowOnboardingSuccessCallout,
    }),
}));

const renderHookWithWrapper = () =>
  renderHook(() => useEnableAssetInventory(), {
    wrapper: createTestProviderWrapper(),
  });

describe('useEnableAssetInventory', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Success', () => {
    it('should call postEnableAssetInventory when enabling asset inventory', async () => {
      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(mockPostEnableAssetInventory).toHaveBeenCalled();
      });
    });

    it('should set isEnabling to true when enabling asset inventory', async () => {
      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(result.current.isEnabling).toBe(true);
      });
    });

    it('should refetch status when asset inventory is enabled', async () => {
      mockPostEnableAssetInventory.mockResolvedValue({});

      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(mockRefetchStatus).toHaveBeenCalled();
      });
    });

    it('should call dispatchSuccessCalloutVisibility when asset inventory is enabled', async () => {
      mockPostEnableAssetInventory.mockResolvedValue({});

      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(mockShowOnboardingSuccessCallout).toHaveBeenCalled();
      });
    });
  });

  describe('Error', () => {
    it('should handle error message when enabling asset inventory', async () => {
      // suppress expected console error messages
      jest.spyOn(console, 'error').mockReturnValue();

      mockPostEnableAssetInventory.mockRejectedValue({
        body: {
          message: 'Unexpected error occurred',
        },
      });

      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(result.current.error).toBe('Unexpected error occurred');
      });
    });

    it('should include default error message when enabling asset inventory rejects with unexpected error message', async () => {
      mockPostEnableAssetInventory.mockRejectedValue({});

      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to enable Asset Inventory. Please try again.');
      });
    });
  });
});
