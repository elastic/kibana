/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { AssetInventoryStatusResponse } from '../../../common/api/asset_inventory/types';
import { useAssetInventoryRoutes } from './use_asset_inventory_routes';

const ASSET_INVENTORY_STATUS_KEY = ['GET', 'ASSET_INVENTORY_STATUS'];

export const useAssetInventoryStatus = () => {
  const { getAssetInventoryStatus } = useAssetInventoryRoutes();

  return useQuery<AssetInventoryStatusResponse>({
    queryKey: ASSET_INVENTORY_STATUS_KEY,
    queryFn: () => getAssetInventoryStatus(),
    refetchInterval: (data) => {
      if (data?.status === 'ready') {
        return false;
      }
      return 3000;
    },
    refetchOnMount: true,
  });
};
