/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ONBOARDING_PATH, SecurityPageName } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { OnboardingPage } from './components/onboarding';

export const routes: SecuritySubPluginRoutes = [
  {
    path: ONBOARDING_PATH,
    component: withSecurityRoutePageWrapper(OnboardingPage, SecurityPageName.landing),
  },
];
