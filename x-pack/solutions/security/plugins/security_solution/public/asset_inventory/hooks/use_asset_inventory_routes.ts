/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ASSET_INVENTORY_INSTALL_DATA_VIEW_API_PATH } from '../../../common/api/asset_inventory/constants';
import type { AssetInventoryInstallDataViewResponse } from '../../../common/api/asset_inventory/types';
import { API_VERSIONS } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';

export const useAssetInventoryRoutes = () => {
  const http = useKibana().services.http;

  return useMemo(() => {
    const postInstallAssetInventoryDataView = async () => {
      return http.fetch<AssetInventoryInstallDataViewResponse>(
        ASSET_INVENTORY_INSTALL_DATA_VIEW_API_PATH,
        {
          method: 'POST',
          version: API_VERSIONS.public.v1,
        }
      );
    };

    return {
      postInstallAssetInventoryDataView,
    };
  }, [http]);
};
