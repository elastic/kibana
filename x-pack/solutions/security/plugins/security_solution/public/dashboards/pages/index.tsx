/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { DashboardView } from './details';
import { DASHBOARDS_PATH } from '../../../common/constants';
import { HashDashboardLinkRedirect } from '../components/hash_dashboard_link_redirect';

const DashboardsViewContainerComponent = () => {
  return (
    <Routes>
      <Route strict path={`${DASHBOARDS_PATH}/create`}>
        <DashboardView initialViewMode={'edit'} />
      </Route>
      <Route strict path={`${DASHBOARDS_PATH}/:detailName/edit`}>
        <HashDashboardLinkRedirect />
        <DashboardView initialViewMode={'edit'} />
      </Route>
      <Route strict path={`${DASHBOARDS_PATH}/:detailName`}>
        <HashDashboardLinkRedirect />
        <DashboardView initialViewMode={'view'} />
      </Route>
    </Routes>
  );
};
export const DashboardsViewContainer = React.memo(DashboardsViewContainerComponent);
