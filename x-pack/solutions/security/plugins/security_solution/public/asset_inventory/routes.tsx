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
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { AssetInventoryLoading } from './components/asset_inventory_loading';

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
  return (
    <QueryClientProvider client={queryClient}>
      <PluginTemplateWrapper>
        <SecuritySolutionPageWrapper noPadding>
          <Suspense fallback={<AssetInventoryLoading />}>
            <AssetsPageLazy />
          </Suspense>
        </SecuritySolutionPageWrapper>
      </PluginTemplateWrapper>
    </QueryClientProvider>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: ASSET_INVENTORY_PATH,
    component: withSecurityRoutePageWrapper(AssetInventoryRoutes, SecurityPageName.assetInventory),
  },
];
