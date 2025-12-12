/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import type { ExperimentalFeatures } from '../../common';
import type { SecuritySubPluginRoutes } from '../app/types';
import {
  SIEM_MIGRATIONS_DASHBOARDS_PATH,
  SIEM_MIGRATIONS_LANDING_PATH,
  SIEM_MIGRATIONS_RULES_PATH,
  SecurityPageName,
} from '../../common/constants';
import { MigrationDashboardsPage } from './dashboards/pages';
import { MigrationRulesPage } from './rules/pages';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { MigrationsLandingPage } from './landing';

const SiemMigrationsLandingRoutes = () => {
  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.siemMigrationsLanding}>
        <Routes>
          <Route path={SIEM_MIGRATIONS_LANDING_PATH} component={MigrationsLandingPage} />
        </Routes>
      </SecurityRoutePageWrapper>
    </PluginTemplateWrapper>
  );
};

const SiemMigrationsRulesRoutes = () => {
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

const SiemMigrationsDashboardsRoutes = () => {
  return (
    <PluginTemplateWrapper>
      <SecurityRoutePageWrapper pageName={SecurityPageName.siemMigrationsDashboards}>
        <Routes>
          <Route
            path={`${SIEM_MIGRATIONS_DASHBOARDS_PATH}/:migrationId?`}
            component={MigrationDashboardsPage}
          />
        </Routes>
      </SecurityRoutePageWrapper>
    </PluginTemplateWrapper>
  );
};

export const getSiemMigrationsRoutes = (
  experimentalFeatures: ExperimentalFeatures
): SecuritySubPluginRoutes => {
  const isSiemMigrationsEnabled = !experimentalFeatures.siemMigrationsDisabled;
  const isAutomaticDashboardsMigrationEnabled = experimentalFeatures.automaticDashboardsMigration;
  return [
    ...(isSiemMigrationsEnabled
      ? [
          {
            path: SIEM_MIGRATIONS_LANDING_PATH,
            component: SiemMigrationsLandingRoutes,
          },
          {
            path: SIEM_MIGRATIONS_RULES_PATH,
            component: SiemMigrationsRulesRoutes,
          },
        ]
      : []),
    ...(isSiemMigrationsEnabled && isAutomaticDashboardsMigrationEnabled
      ? [
          {
            path: SIEM_MIGRATIONS_DASHBOARDS_PATH,
            component: SiemMigrationsDashboardsRoutes,
          },
        ]
      : []),
  ];
};
