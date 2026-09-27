/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { ALERTS_V2_PATH } from '../../common/constants';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { AlertsV2Page } from './pages';

export const AlertsV2Container = () => (
  <PluginTemplateWrapper>
    <SecuritySolutionPageWrapper>
      <Routes>
        <Route exact path={ALERTS_V2_PATH} component={AlertsV2Page} />
      </Routes>
    </SecuritySolutionPageWrapper>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: ALERTS_V2_PATH,
    component: withSecurityRoutePageWrapper(AlertsV2Container, SecurityPageName.alertsV2),
  },
];
