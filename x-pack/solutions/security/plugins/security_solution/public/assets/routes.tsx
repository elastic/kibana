/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { ASSETS_PATH } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
import { Assets } from './assets';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const AssetsPage = React.memo(function AssetsPage() {
  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.assets} redirectOnMissing>
        <Assets />
      </SecurityRoutePageWrapper>
    </PluginTemplateWrapper>
  );
});

export const routes: SecuritySubPluginRoutes = [
  {
    path: ASSETS_PATH,
    component: AssetsPage,
  },
];
