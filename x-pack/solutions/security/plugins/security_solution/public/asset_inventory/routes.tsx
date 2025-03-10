/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { ASSET_INVENTORY_PATH } from '../../common/constants';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { DataViewContext } from './hooks/data_view_context';
import { useDataView } from './hooks/use_asset_inventory_data_table/use_data_view';
import { AssetInventoryLoading } from './components/asset_inventory_loading';
import { ASSET_INVENTORY_INDEX_PATTERN } from './constants';

const AssetsPageLazy = lazy(() => import('./pages'));

// Initializing react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

export const AssetInventoryRoutes = () => {
  const dataViewQuery = useDataView(ASSET_INVENTORY_INDEX_PATTERN);

  const dataViewContextValue = {
    dataView: dataViewQuery.data!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
    dataViewRefetch: dataViewQuery.refetch,
    dataViewIsLoading: dataViewQuery.isLoading,
    dataViewIsRefetching: dataViewQuery.isRefetching,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SecurityRoutePageWrapper pageName={SecurityPageName.assetInventory}>
        <DataViewContext.Provider value={dataViewContextValue}>
          <SecuritySolutionPageWrapper noPadding>
            <Suspense fallback={<AssetInventoryLoading />}>
              <AssetsPageLazy />
            </Suspense>
          </SecuritySolutionPageWrapper>
        </DataViewContext.Provider>
      </SecurityRoutePageWrapper>
    </QueryClientProvider>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: ASSET_INVENTORY_PATH,
    component: AssetInventoryRoutes,
  },
];
