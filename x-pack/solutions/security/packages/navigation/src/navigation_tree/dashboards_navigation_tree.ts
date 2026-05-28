/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '../constants';
import { securityLink } from '../links';

export const RECENT_DASHBOARDS_EXTENSION_POINT_ID =
  'xpack.security.nav.dashboards.extensions.recent';

export const createDashboardsNavigationTree = (): NodeDefinition => ({
  id: SecurityPageName.dashboards,
  icon: 'productDashboard',
  renderAs: 'panelOpener',
  link: securityLink(SecurityPageName.dashboards),
  children: [
    {
      id: 'recent-dashboards',
      title: i18n.translate('securitySolutionPackages.navLinks.dashboards.recentlyViewed', {
        defaultMessage: 'Recently viewed',
      }),
      renderAs: 'extensionPoint',
      extensionPointId: RECENT_DASHBOARDS_EXTENSION_POINT_ID,
      popoverOnly: true,
    },
    {
      id: `${SecurityPageName.dashboards}-links`,
      title: i18n.translate('securitySolutionPackages.navLinks.dashboards', {
        defaultMessage: 'Dashboards',
      }),
      children: [
        {
          id: SecurityPageName.overview,
          link: securityLink(SecurityPageName.overview),
        },
        {
          id: SecurityPageName.detectionAndResponse,
          link: securityLink(SecurityPageName.detectionAndResponse),
        },
        {
          id: SecurityPageName.cloudSecurityPostureDashboard,
          link: securityLink(SecurityPageName.cloudSecurityPostureDashboard),
        },
        {
          id: SecurityPageName.cloudSecurityPostureVulnerabilityDashboard,
          link: securityLink(SecurityPageName.cloudSecurityPostureVulnerabilityDashboard),
        },
        {
          id: SecurityPageName.entityAnalytics,
          link: securityLink(SecurityPageName.entityAnalytics),
        },
        {
          id: SecurityPageName.dataQuality,
          link: securityLink(SecurityPageName.dataQuality),
        },
        {
          id: SecurityPageName.kubernetes,
          link: securityLink(SecurityPageName.kubernetes),
        },
      ],
    },
  ],
});
