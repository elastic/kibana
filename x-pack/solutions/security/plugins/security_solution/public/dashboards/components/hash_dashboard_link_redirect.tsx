/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HashRouter, Routes, Route } from '@kbn/shared-ux-router';
import { SecurityPageName } from '../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useNavigateTo } from '../../common/lib/kibana';

const HashDashboardLinkRoute = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { navigateTo } = useNavigateTo();

  useEffect(() => {
    if (!dashboardId) {
      return;
    }
    // Clear the hash immediately so the broken URL doesn't linger in the address bar/history
    // while we redirect to the correct, path-based Security dashboard URL.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    navigateTo({
      url: getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: decodeURIComponent(dashboardId),
      }),
    });
  }, [dashboardId, getSecuritySolutionUrl, navigateTo]);

  return null;
};

/**
 * Some Fleet/Beats integration packages (e.g. Osquery Manager) ship markdown panels containing
 * links using Kibana's old hash-based dashboard routes, e.g. `#/dashboard/<id>` or `#/view/<id>`.
 * Security's dashboards pages are path-routed (not hash-routed), so clicking one of these links
 * only mutates the current page's hash instead of navigating to the target dashboard.
 *
 * Mounting a `HashRouter` here lets us listen for that hash change - the same mechanism the
 * standalone Dashboard app relies on to make these links work - and redirect to the equivalent
 * Security dashboard URL. It coexists with Security's own path-based routing since a `HashRouter`
 * only ever reads/writes the `location.hash` portion of the URL.
 */
export const HashDashboardLinkRedirect = () => (
  <HashRouter>
    <Routes>
      <Route path="/dashboard/:dashboardId">
        <HashDashboardLinkRoute />
      </Route>
      <Route path="/view/:dashboardId">
        <HashDashboardLinkRoute />
      </Route>
    </Routes>
  </HashRouter>
);
