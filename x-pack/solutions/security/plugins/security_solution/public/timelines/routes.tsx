/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { TIMELINES_PATH } from '../../common/constants';
import { Timelines } from './pages';

const TimelinesRoutes = () => (
  <PluginTemplateWrapper>
    <Timelines />
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: TIMELINES_PATH,
    component: withSecurityRoutePageWrapper(TimelinesRoutes, SecurityPageName.timelines),
  },
];
