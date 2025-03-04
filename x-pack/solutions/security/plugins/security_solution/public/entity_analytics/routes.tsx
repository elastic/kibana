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

import {
  ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
  ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  SecurityPageName,
} from '../../common/constants';
import { EntityAnalyticsManagementPage } from './pages/entity_analytics_management_page';
import { EntityStoreManagementPage } from './pages/entity_store_management_page';

const EntityAnalyticsManagementTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.entityAnalyticsManagement}>
    <EntityAnalyticsManagementPage />
    <SpyRoute pageName={SecurityPageName.entityAnalyticsManagement} />
  </TrackApplicationView>
);

const EntityAnalyticsManagementContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_MANAGEMENT_PATH}
        exact
        component={EntityAnalyticsManagementTelemetry}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});
EntityAnalyticsManagementContainer.displayName = 'EntityAnalyticsManagementContainer';

const EntityAnalyticsAssetClassificationTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.entityAnalyticsAssetClassification}>
    <EntityStoreManagementPage />
    <SpyRoute pageName={SecurityPageName.entityAnalyticsAssetClassification} />
  </TrackApplicationView>
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

const EntityAnalyticsEntityStoreTelemetry = () => (
  <TrackApplicationView viewId={SecurityPageName.entityAnalyticsEntityStoreManagement}>
    <EntityStoreManagementPage />
    <SpyRoute pageName={SecurityPageName.entityAnalyticsEntityStoreManagement} />
  </TrackApplicationView>
);

const EntityAnalyticsEntityStoreContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route
        path={ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH}
        exact
        component={EntityAnalyticsEntityStoreTelemetry}
      />
      <Route component={NotFoundPage} />
    </Routes>
  );
});

EntityAnalyticsEntityStoreContainer.displayName = 'EntityAnalyticsEntityStoreContainer';

export const routes = [
  {
    path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
    component: EntityAnalyticsManagementContainer,
  },
  {
    path: ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
    component: EntityAnalyticsAssetClassificationContainer,
  },
  {
    path: ENTITY_ANALYTICS_ENTITY_STORE_MANAGEMENT_PATH,
    component: EntityAnalyticsEntityStoreContainer,
  },
];
