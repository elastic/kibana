/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAssetInventoryRoutes } from './use_asset_inventory_routes';
import { useKibana } from '../../common/lib/kibana';
import { API_VERSIONS } from '../../../common/constants';
import {
  ASSET_INVENTORY_ENABLE_API_PATH,
  ASSET_INVENTORY_STATUS_API_PATH,
} from '../../../common/api/asset_inventory/constants';

jest.mock('../../common/lib/kibana');

describe('useAssetInventoryRoutes', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: { fetch: mockFetch },
      },
    });
  });

  it('calls the correct endpoint and options for `postEnableAssetInventory`', async () => {
    mockFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(useAssetInventoryRoutes);
    await result.current.postEnableAssetInventory();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(ASSET_INVENTORY_ENABLE_API_PATH, {
      method: 'POST',
      version: API_VERSIONS.public.v1,
      body: JSON.stringify({}),
    });
  });

  it('calls the correct endpoint and options for `getAssetInventoryStatus`', async () => {
    mockFetch.mockResolvedValue({ status: 'enabled' });

    const { result } = renderHook(useAssetInventoryRoutes);
    const response = await result.current.getAssetInventoryStatus();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(ASSET_INVENTORY_STATUS_API_PATH, {
      method: 'GET',
      version: API_VERSIONS.public.v1,
      query: {},
    });
    expect(response).toEqual({ status: 'enabled' });
  });
});
