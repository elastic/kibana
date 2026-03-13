/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { NotFoundPage } from '../app/404';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import {
  ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
  ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_LANDING_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  ENTITY_ANALYTICS_OVERVIEW_PATH,
  ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
  SecurityPageName,
  ENTITY_ANALYTICS_WATCHLISTS_PATH,
} from '../../common/constants';
import { EntityAnalyticsManagementPage } from './pages/entity_analytics_management_page';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { EntityStoreManagementPage } from './pages/entity_store_management_page';
import { EntityAnalyticsLandingPage } from './pages/entity_analytics_landing';
import { EntityAnalyticsPrivilegedUserMonitoringPage } from './pages/entity_analytics_privileged_user_monitoring_page';
import { OverviewDashboard } from './pages/entity_analytics_overview_page';
import { EntityThreatHuntingPage } from './pages/entity_threat_hunting_page';
import { EntityAnalyticsWatchlistsManagementPage } from './pages/entity_analytics_watchlists_management_page';

// ---- Management routes ----
const EntityAnalyticsManagementWrapper = () => (
  <PluginTemplateWrapper>
    <EntityAnalyticsManagementPage />
  </PluginTemplateWrapper>
);

const EntityAnalyticsManagementContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_MANAGEMENT_PATH}
        exact
        component={EntityAnalyticsManagementWrapper}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});
EntityAnalyticsManagementContainer.displayName = 'EntityAnalyticsManagementContainer';

// ---- Asset criticality redirect route ----
const EntityAnalyticsAssetClassificationContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH}
        exact
        render={({ location }) => (
          <Redirect
            to={{
              ...location,
              pathname: ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
              search: location.search,
            }}
          />
        )}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsAssetClassificationContainer.displayName =
  'EntityAnalyticsAssetClassificationContainer';

// ---- Entity store routes ----
const EntityAnalyticsEntityStoreWrapper = () => (
  <PluginTemplateWrapper>
    <EntityStoreManagementPage />
  </PluginTemplateWrapper>
);

const EntityAnalyticsEntityStoreContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH}
        exact
        component={EntityAnalyticsEntityStoreWrapper}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsEntityStoreContainer.displayName = 'EntityAnalyticsEntityStoreContainer';

// ---- Landing routes ----
const EntityAnalyticsLandingWrapper = () => (
  <PluginTemplateWrapper>
    <EntityAnalyticsLandingPage />
  </PluginTemplateWrapper>
);

const EntityAnalyticsLandingContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route path={ENTITY_ANALYTICS_LANDING_PATH} exact component={EntityAnalyticsLandingWrapper} />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsLandingContainer.displayName = 'EntityAnalyticsLandingContainer';

// ---- Privileged user monitoring routes ----
const EntityAnalyticsPrivilegedUserMonitoringWrapper = () => (
  <PluginTemplateWrapper>
    <EntityAnalyticsPrivilegedUserMonitoringPage />
  </PluginTemplateWrapper>
);

const EntityAnalyticsPrivilegedUserMonitoringContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH}
        exact
        component={EntityAnalyticsPrivilegedUserMonitoringWrapper}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsPrivilegedUserMonitoringContainer.displayName =
  'EntityAnalyticsPrivilegedUserMonitoringContainer';

// ---- Watchlists routes ----
const EntityAnalyticsWatchlistsWrapper = () => (
  <PluginTemplateWrapper>
    <EntityAnalyticsWatchlistsManagementPage />
  </PluginTemplateWrapper>
);

const EntityAnalyticsWatchlistsContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_WATCHLISTS_PATH}
        exact
        component={EntityAnalyticsWatchlistsWrapper}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsWatchlistsContainer.displayName = 'EntityAnalyticsWatchlistsContainer';

// ---- Overview routes ----
const EntityAnalyticsOverviewWrapper = () => (
  <PluginTemplateWrapper>
    <OverviewDashboard />
  </PluginTemplateWrapper>
);

const EntityAnalyticsOverviewContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_OVERVIEW_PATH}
        exact
        component={EntityAnalyticsOverviewWrapper}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsOverviewContainer.displayName = 'EntityAnalyticsOverviewContainer';

// ---- Threat hunting routes ----
const EntityThreatHuntingWrapper = () => (
  <PluginTemplateWrapper>
    <EntityThreatHuntingPage />
  </PluginTemplateWrapper>
);

const EntityThreatHuntingContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_THREAT_HUNTING_PATH}
        exact
        component={EntityThreatHuntingWrapper}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityThreatHuntingContainer.displayName = 'EntityThreatHuntingContainer';

// ---- Route definitions ----
export const routes = [
  {
    path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsManagementContainer,
      SecurityPageName.entityAnalyticsManagement
    ),
  },
  {
    path: ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
    component: EntityAnalyticsAssetClassificationContainer,
  },
  {
    path: ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsEntityStoreContainer,
      SecurityPageName.entityAnalyticsEntityStoreManagement
    ),
  },
  {
    path: ENTITY_ANALYTICS_LANDING_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsLandingContainer,
      SecurityPageName.entityAnalyticsLanding
    ),
  },
  {
    path: ENTITY_ANALYTICS_WATCHLISTS_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsWatchlistsContainer,
      SecurityPageName.entityAnalyticsWatchlists
    ),
  },
  {
    path: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsPrivilegedUserMonitoringContainer,
      SecurityPageName.entityAnalyticsPrivilegedUserMonitoring
    ),
  },
  {
    path: ENTITY_ANALYTICS_OVERVIEW_PATH,
    component: withSecurityRoutePageWrapper(
      EntityAnalyticsOverviewContainer,
      SecurityPageName.entityAnalyticsOverview
    ),
  },
  {
    path: ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
    component: withSecurityRoutePageWrapper(
      EntityThreatHuntingContainer,
      SecurityPageName.entityAnalyticsThreatHunting
    ),
  },
];
