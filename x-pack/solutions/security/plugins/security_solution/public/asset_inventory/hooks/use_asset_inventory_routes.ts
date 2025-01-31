/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { API_VERSIONS } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';

export const useAssetInventoryRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const postEnableAssetInventory = async () => {
      return http.fetch<{ response: string }>('/api/asset_inventory/enable', {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({}),
      });
    };

    const getAssetInventoryStatus = async () => {
      return http.fetch<{
        status: string;
      }>('/api/asset_inventory/status', {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {},
      });
    };

    return {
      getAssetInventoryStatus,
      enableAssetInventory,
    };
  }, [http]);
};
