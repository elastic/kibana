/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useInstallDataView } from './use_install_data_view';
import { createTestProviderWrapper } from '../../../test/test_provider';

const mockPostInstallAssetInventoryDataView = vi.fn();
const mockCallback = vi.fn();

vi.mock('../../../hooks/use_asset_inventory_routes', () => {
      const mocked = {
      useAssetInventoryRoutes: () => ({
        postInstallAssetInventoryDataView: mockPostInstallAssetInventoryDataView,
      }),
    };
      return { ...mocked, default: mocked };
    });

const renderHookWithWrapper = () =>
  renderHook(
    () =>
      useInstallDataView({
        callback: mockCallback,
      }),
    {
      wrapper: createTestProviderWrapper(),
    }
  );

describe('useInstallDataView', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Success', () => {
    it('should call postInstallAssetInventoryDataView when installing data view', async () => {
      const { result } = renderHookWithWrapper();

      result.current.installDataView();

      await waitFor(() => {
        expect(mockPostInstallAssetInventoryDataView).toHaveBeenCalled();
      });
    });

    it('should set isInstalling to true when installing data view', async () => {
      const { result } = renderHookWithWrapper();

      result.current.installDataView();

      await waitFor(() => {
        expect(result.current.isInstalling).toBe(true);
      });
    });

    it('should trigger callback when data view is installed', async () => {
      const { result } = renderHookWithWrapper();

      result.current.installDataView();

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });
  });

  describe('Error', () => {
    it('should handle error message when installing data view', async () => {
      // suppress expected console error messages
      vi.spyOn(console, 'error').mockReturnValue();

      mockPostInstallAssetInventoryDataView.mockRejectedValue({
        body: {
          message: 'Unexpected error occurred',
        },
      });

      const { result } = renderHookWithWrapper();

      result.current.installDataView();

      await waitFor(() => {
        expect(result.current.error).toBe('Unexpected error occurred');
      });
    });

    it('should include default error message when installing data view rejects with unexpected error message', async () => {
      mockPostInstallAssetInventoryDataView.mockRejectedValue({});

      const { result } = renderHookWithWrapper();

      result.current.installDataView();

      await waitFor(() => {
        expect(result.current.error).toBe(
          'Failed to install Asset Inventory data view. Please try again.'
        );
      });
    });
  });
});
