/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { MANAGEMENT_PATH, MANAGE_PATH } from '../../common/constants';
import { SecurityPageName } from '../app/types';
import { ManagementContainer } from './pages';
import type { SecuritySubPluginRoutes } from '../app/types';
import { CurrentLicense } from '../common/components/current_license';
import { ManageLandingPage } from './pages/landing';

const ManagementLanding = () => (
  <SecurityRoutePageWrapper pageName={SecurityPageName.administration} redirectOnMissing>
    <ManageLandingPage />
  </SecurityRoutePageWrapper>
);

/**
 * Returns the React Router Routes for the management area
 */
const ManagementRoutes = () => (
  <CurrentLicense>
    <ManagementContainer />
  </CurrentLicense>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: MANAGE_PATH,
    component: React.memo(ManagementLanding),
  },
  {
    path: MANAGEMENT_PATH,
    component: React.memo(ManagementRoutes),
  },
];
