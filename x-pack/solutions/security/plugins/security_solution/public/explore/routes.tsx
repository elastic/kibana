/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { UsersContainer } from './users/pages';
import { HostsContainer } from './hosts/pages';
import { NetworkContainer } from './network/pages';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { EXPLORE_PATH, HOSTS_PATH, NETWORK_PATH, USERS_PATH } from '../../common/constants';
import { ExploreLandingPage } from './landing';

const ExploreLanding = () => (
  <TrackApplicationView viewId={SecurityPageName.exploreLanding}>
    <ExploreLandingPage />
  </TrackApplicationView>
);

const NetworkRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.network}>
    <NetworkContainer />
  </TrackApplicationView>
);

const UsersRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.users}>
    <UsersContainer />
  </TrackApplicationView>
);

const HostsRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.hosts}>
    <HostsContainer />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: EXPLORE_PATH,
    exact: true,
    component: ExploreLanding,
  },
  {
    path: NETWORK_PATH,
    component: NetworkRoutes,
  },
  {
    path: USERS_PATH,
    component: UsersRoutes,
  },
  {
    path: HOSTS_PATH,
    component: HostsRoutes,
  },
];
