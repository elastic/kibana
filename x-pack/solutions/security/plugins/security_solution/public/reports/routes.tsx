/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityPageName, AI_VALUE_PATH } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

import { AIValue } from './pages/ai_value';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const AIValueRoutes = () => (
  <PluginTemplateWrapper>
    <AIValue />
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: AI_VALUE_PATH,
    component: withSecurityRoutePageWrapper(AIValueRoutes, SecurityPageName.aiValue),
  },
];
