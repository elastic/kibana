/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { SecurityPageName } from '../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useNavigateTo } from '../../common/lib/kibana';

/**
 * Matches legacy Kibana hash-based dashboard routes, e.g. `#/dashboard/<id>` or `#/view/<id>`.
 * Captures the dashboard id up to the next query/hash delimiter.
 */
const LEGACY_HASH_DASHBOARD_LINK = /^#\/(?:dashboard|view)\/([^/?#]+)/;

const getLegacyDashboardIdFromHash = (hash: string): string | undefined => {
  const match = hash.match(LEGACY_HASH_DASHBOARD_LINK);
  if (!match?.[1]) {
    return undefined;
  }
  return decodeURIComponent(match[1]);
};

/**
 * Some markdown panels still ship legacy hash dashboard links, e.g.
 * `[Compliance](#/dashboard/osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05)`.
 * This listener redirects that hash to the path-based URL
 * `/app/security/dashboards/osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05`.
 */
export const HashDashboardLinkRedirect = () => {
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { navigateTo } = useNavigateTo();
  const history = useHistory();

  useEffect(() => {
    const redirectOnLegacyDashboardHash = () => {
      const dashboardId = getLegacyDashboardIdFromHash(window.location.hash);
      if (!dashboardId) {
        return;
      }
      // Clear the hash immediately so the broken URL doesn't linger in the address bar/history
      // while we redirect to the correct, path-based Security dashboard URL. This must go
      // through the same `history` instance the app's router listens to (rather than the raw
      // `window.history` API) so the router's location stays in sync with the subsequent
      // `navigateTo()` call below; otherwise the router misses the navigation and the dashboard
      // never re-renders for the new id.
      history.replace(window.location.pathname + window.location.search);
      navigateTo({
        url: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.dashboards,
          path: dashboardId,
        }),
      });
    };

    redirectOnLegacyDashboardHash();
    window.addEventListener('hashchange', redirectOnLegacyDashboardHash);
    return () => {
      window.removeEventListener('hashchange', redirectOnLegacyDashboardHash);
    };
  }, [getSecuritySolutionUrl, navigateTo, history]);

  return null;
};
