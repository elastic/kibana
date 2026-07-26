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

const mockInstallEntityStore = jest.fn();
const mockPostInstallAssetInventoryDataView = jest.fn();
const mockRefetchStatus = jest.fn();
const mockShowOnboardingSuccessCallout = jest.fn();

jest.mock('../../../../entity_analytics/components/entity_store/hooks/use_entity_store', () => ({
  useInstallEntityStoreMutation: () => ({
    mutateAsync: mockInstallEntityStore,
  }),
}));

jest.mock('../../../hooks/use_asset_inventory_routes', () => ({
  useAssetInventoryRoutes: () => ({
    postInstallAssetInventoryDataView: mockPostInstallAssetInventoryDataView,
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
    beforeEach(() => {
      mockInstallEntityStore.mockResolvedValue(undefined);
      mockPostInstallAssetInventoryDataView.mockResolvedValue({});
    });

    it('installs the entity store first, then posts the asset inventory data view', async () => {
      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(mockInstallEntityStore).toHaveBeenCalled();
        expect(mockPostInstallAssetInventoryDataView).toHaveBeenCalled();
      });

      // Ensure ordering: data-view install happens after entity-store install resolves
      const installOrder = mockInstallEntityStore.mock.invocationCallOrder[0];
      const dataViewOrder = mockPostInstallAssetInventoryDataView.mock.invocationCallOrder[0];
      expect(installOrder).toBeLessThan(dataViewOrder);
    });

    it('sets isEnabling to true after enabling asset inventory', async () => {
      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(result.current.isEnabling).toBe(true);
      });
    });

    it('refetches the composed status after enabling', async () => {
      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(mockRefetchStatus).toHaveBeenCalled();
      });
    });

    it('shows the onboarding success callout', async () => {
      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(mockShowOnboardingSuccessCallout).toHaveBeenCalled();
      });
    });
  });

  describe('Error', () => {
    it('surfaces a server error message when the mutation rejects', async () => {
      jest.spyOn(console, 'error').mockReturnValue();

      mockInstallEntityStore.mockRejectedValue({
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

    it('falls back to a default error message when none is provided', async () => {
      mockInstallEntityStore.mockRejectedValue({});

      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to enable Asset Inventory. Please try again.');
      });
    });

    it('does not call the data-view install route when the entity-store install fails', async () => {
      mockInstallEntityStore.mockRejectedValue({});

      const { result } = renderHookWithWrapper();

      result.current.enableAssetInventory();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(mockPostInstallAssetInventoryDataView).not.toHaveBeenCalled();
    });
  });
});
