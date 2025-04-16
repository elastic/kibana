/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { SpyRoute } from '../common/utils/route/spy_routes';
import { NotFoundPage } from '../app/404';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import {
  ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
  ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_LANDING_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  SecurityPageName,
} from '../../common/constants';
import { EntityAnalyticsManagementPage } from './pages/entity_analytics_management_page';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { EntityStoreManagementPage } from './pages/entity_store_management_page';
import { EntityAnalyticsLandingPage } from './pages/entity_analytics_landing';
import { EntityAnalyticsPrivilegedUserMonitoringPage } from './pages/entity_analytics_privileged_user_monitoring_page';

const EntityAnalyticsManagementContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_MANAGEMENT_PATH}
        exact
        component={EntityAnalyticsManagementPage}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});
EntityAnalyticsManagementContainer.displayName = 'EntityAnalyticsManagementContainer';

const EntityAnalyticsAssetClassificationTelemetry = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.entityAnalyticsAssetClassification}>
      <EntityStoreManagementPage />
      <SpyRoute pageName={SecurityPageName.entityAnalyticsAssetClassification} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const EntityAnalyticsAssetClassificationContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH}
        exact
        component={EntityAnalyticsAssetClassificationTelemetry}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsAssetClassificationContainer.displayName =
  'EntityAnalyticsAssetClassificationContainer';

const EntityAnalyticsEntityStoreContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH}
        exact
        component={EntityStoreManagementPage}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsEntityStoreContainer.displayName = 'EntityAnalyticsEntityStoreContainer';
const EntityAnalyticsLandingContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route path={ENTITY_ANALYTICS_LANDING_PATH} exact component={EntityAnalyticsLandingPage} />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsLandingContainer.displayName = 'EntityAnalyticsLandingContainer';

const EntityAnalyticsPrivilegedUserMonitoringContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH}
        exact
        component={EntityAnalyticsPrivilegedUserMonitoringPage}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsPrivilegedUserMonitoringContainer.displayName =
  'EntityAnalyticsPrivilegedUserMonitoringContainer';

export const routes = [
  {
    path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsManagementContainer,
      SecurityPageName.entityAnalyticsManagement,
      {
        redirectOnMissing: true,
      }
    ),
  },
  {
    path: ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsAssetClassificationContainer,
      SecurityPageName.entityAnalyticsAssetClassification,
      {
        redirectOnMissing: true,
      }
    ),
  },
  {
    path: ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsEntityStoreContainer,
      SecurityPageName.entityAnalyticsEntityStoreManagement,
      {
        redirectOnMissing: true,
      }
    ),
  },
  {
    path: ENTITY_ANALYTICS_LANDING_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsLandingContainer,
      SecurityPageName.entityAnalyticsLanding,
      {
        redirectOnMissing: true,
      }
    ),
  },
  {
    path: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsPrivilegedUserMonitoringContainer,
      SecurityPageName.privilegedUserMonitoring,
      {
        redirectOnMissing: true,
      }
    ),
  },
];
