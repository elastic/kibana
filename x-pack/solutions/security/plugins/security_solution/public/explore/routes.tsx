/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UsersContainer } from './users/pages';
import { HostsContainer } from './hosts/pages';
import { NetworkContainer } from './network/pages';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { EXPLORE_PATH, HOSTS_PATH, NETWORK_PATH, USERS_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { ExploreLandingPage } from './landing';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const ExploreLanding = () => (
  <PluginTemplateWrapper>
    <ExploreLandingPage />
  </PluginTemplateWrapper>
);

const NetworkRoutes = () => (
  <PluginTemplateWrapper>
    <NetworkContainer />
  </PluginTemplateWrapper>
);

const UsersRoutes = () => (
  <PluginTemplateWrapper>
    <UsersContainer />
  </PluginTemplateWrapper>
);

const HostsRoutes = () => (
  <PluginTemplateWrapper>
    <HostsContainer />
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: EXPLORE_PATH,
    exact: true,
    component: withSecurityRoutePageWrapper(ExploreLanding, SecurityPageName.exploreLanding, {
      omitSpyRoute: true,
    }),
  },
  {
    path: NETWORK_PATH,
    component: withSecurityRoutePageWrapper(NetworkRoutes, SecurityPageName.network, {
      omitSpyRoute: true,
    }),
  },
  {
    path: USERS_PATH,
    component: withSecurityRoutePageWrapper(UsersRoutes, SecurityPageName.users, {
      omitSpyRoute: true,
    }),
  },
  {
    path: HOSTS_PATH,
    component: withSecurityRoutePageWrapper(HostsRoutes, SecurityPageName.hosts, {
      omitSpyRoute: true,
    }),
  },
];
