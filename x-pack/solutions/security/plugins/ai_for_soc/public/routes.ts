/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { SecuritySubPluginRoutes } from '@kbn/security-solution-plugin/public/app/types';
import { withSecurityRoutePageWrapper } from '@kbn/security-solution-plugin/public/common/components/security_route_page_wrapper';
import { APP_PATH } from '../common/constants';
import { AiForSocLandingPage } from './pages/landing';

export const routes: SecuritySubPluginRoutes = [
  {
    path: APP_PATH,
    component: withSecurityRoutePageWrapper(AiForSocLandingPage, SecurityPageName.landing),
  },
];
