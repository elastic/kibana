/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EuiLoadingElastic } from '@elastic/eui';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { SIEM_READINESS_PATH } from '../../common/constants';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const SiemReadinessDashboardLazy = lazy(() => import('./pages'));

const queryClient = new QueryClient();

export const SiemReadinessRoutes = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PluginTemplateWrapper>
        <SecuritySolutionPageWrapper noPadding>
          <Suspense fallback={<EuiLoadingElastic />}>
            <SiemReadinessDashboardLazy />
          </Suspense>
        </SecuritySolutionPageWrapper>
      </PluginTemplateWrapper>
    </QueryClientProvider>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: SIEM_READINESS_PATH,
    component: withSecurityRoutePageWrapper(SiemReadinessRoutes, SecurityPageName.siemReadiness),
  },
];
