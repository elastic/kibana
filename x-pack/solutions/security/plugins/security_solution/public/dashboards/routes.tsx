/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { DASHBOARDS_PATH, SecurityPageName } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { DashboardContextProvider } from './context/dashboard_context';
import { DashboardsLandingPage } from './pages/landing_page';
import { DashboardsViewContainer } from './pages';

const DashboardLandingRoutes = () => (
  <PluginTemplateWrapper>
    <DashboardContextProvider>
      <DashboardsLandingPage />
    </DashboardContextProvider>
  </PluginTemplateWrapper>
);

const DashboardViewRoutes = () => (
  <PluginTemplateWrapper paddingSize="none">
    <DashboardContextProvider>
      <DashboardsViewContainer />
    </DashboardContextProvider>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: DASHBOARDS_PATH,
    exact: true,
    component: withSecurityRoutePageWrapper(DashboardLandingRoutes, SecurityPageName.dashboards),
  },
  {
    path: DASHBOARDS_PATH,
    component: withSecurityRoutePageWrapper(DashboardViewRoutes, SecurityPageName.dashboards),
  },
];
