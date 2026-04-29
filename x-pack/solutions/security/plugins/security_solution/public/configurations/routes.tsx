/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { SecuritySubPluginRoutes } from '../app/types';
import { Configurations } from './page/configurations';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { CONFIGURATIONS_PATH } from '../../common/constants';

export const routes: SecuritySubPluginRoutes = [
  {
    path: `${CONFIGURATIONS_PATH}/:tab?`,
    component: withSecurityRoutePageWrapper(Configurations, SecurityPageName.configurations),
  },
];
