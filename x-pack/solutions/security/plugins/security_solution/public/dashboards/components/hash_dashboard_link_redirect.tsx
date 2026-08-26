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
 * Matches legacy Kibana hash-based dashboard routes, e.g. `#/dashboard/<id>`, `#/view/<id>`,
 * or `#/dashboard/<id>/<expandedPanelId>` when a panel was expanded to full screen.
 * Captures the dashboard id and, when present, the expanded panel id, each up to the next
 * path/query/hash delimiter.
 */
const LEGACY_HASH_DASHBOARD_LINK = /^#\/(?:dashboard|view)\/([^/?#]+)(?:\/([^/?#]+))?/;

interface LegacyDashboardHashMatch {
  dashboardId: string;
  expandedPanelId?: string;
}

/**
 * Checks a decoded dashboard/panel id against the charset real Kibana saved-object ids use
 * (letters, digits, `_`, `.`, `:`, `-`), e.g. `osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05`.
 * An allowlist, rather than a denylist of `/`, `?`, `#`, so a disallowed character can't sneak
 * through by landing in the dashboard id half vs. the expanded panel id half of the hash.
 */
const isSafeHashSegmentId = (decoded: string): boolean => /^[\w.:-]+$/.test(decoded);

/**
 * Decodes a single captured hash segment, failing safe instead of trusting content-controlled
 * data: malformed percent-encoding throws (`decodeURIComponent('100%')`), and anything that
 * decodes outside the safe id charset (`isSafeHashSegmentId`) is rejected rather than spliced
 * verbatim into the path string handed to `history.push`.
 */
const decodeHashSegment = (value: string): string | undefined => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }
  return isSafeHashSegmentId(decoded) ? decoded : undefined;
};

const getLegacyDashboardMatchFromHash = (hash: string): LegacyDashboardHashMatch | undefined => {
  const match = hash.match(LEGACY_HASH_DASHBOARD_LINK);
  if (!match?.[1]) {
    return undefined;
  }
  const dashboardId = decodeHashSegment(match[1]);
  if (!dashboardId) {
    return undefined;
  }
  if (!match[2]) {
    return { dashboardId };
  }
  // A malformed or delimiter-reintroducing expanded panel id is dropped on its own; the
  // dashboard id is still valid, so the redirect can still proceed without it.
  const expandedPanelId = decodeHashSegment(match[2]);
  return expandedPanelId ? { dashboardId, expandedPanelId } : { dashboardId };
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
      const legacyDashboardMatch = getLegacyDashboardMatchFromHash(window.location.hash);
      if (!legacyDashboardMatch) {
        return;
      }
      const { dashboardId, expandedPanelId } = legacyDashboardMatch;

      // Correct the hash in the URL, e.g.
      // /s/my-space/app/security/dashboards/current-dashboard-id#/dashboard/osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05
      // → /s/my-space/app/security/dashboards/current-dashboard-id
      history.replace({ ...history.location, hash: '' });

      // push → /s/my-space/app/security/dashboards/osquery_manager-69f5ae20-eb02-11e7-8f04-51231daa5b05
      navigateTo({
        url: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.dashboards,
          path: expandedPanelId ? `${dashboardId}/${expandedPanelId}` : dashboardId,
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
