/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SIEM_MIGRATIONS_RULES_PATH, SecurityPageName } from '../../common/constants';
import { MigrationRulesPage } from './rules/pages';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

export const SiemMigrationsRoutes = () => {
  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.siemMigrationsRules}>
        <Routes>
          <Route
            path={`${SIEM_MIGRATIONS_RULES_PATH}/:migrationId?`}
            component={MigrationRulesPage}
          />
        </Routes>
      </SecurityRoutePageWrapper>
    </PluginTemplateWrapper>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: SIEM_MIGRATIONS_RULES_PATH,
    component: SiemMigrationsRoutes,
  },
];
