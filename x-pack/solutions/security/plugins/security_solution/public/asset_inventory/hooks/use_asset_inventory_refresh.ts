/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRefresh } from '@kbn/cloud-security-posture/src/hooks/use_refresh';
import { QUERY_KEY_ASSET_INVENTORY } from '../constants';

export const useAssetInventoryRefresh = () => {
  const { refresh: assetInventoryRefresh, isRefreshing: assetInventoryIsRefreshing } =
    useRefresh(QUERY_KEY_ASSET_INVENTORY);

  return {
    assetInventoryRefresh,
    assetInventoryIsRefreshing,
  };
};
