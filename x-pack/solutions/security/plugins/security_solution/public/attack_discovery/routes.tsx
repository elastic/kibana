/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AttackDiscoveryPage } from './pages';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { ATTACK_DISCOVERY_PATH } from '../../common/constants';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

export const AttackDiscoveryRoutes = () => (
  <SecurityRoutePageWrapper pageName={SecurityPageName.attackDiscovery}>
    <AttackDiscoveryPage />
  </SecurityRoutePageWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: ATTACK_DISCOVERY_PATH,
    component: AttackDiscoveryRoutes,
  },
];
