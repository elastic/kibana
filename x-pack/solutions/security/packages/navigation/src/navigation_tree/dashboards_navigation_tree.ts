/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '../constants';
import { securityLink } from '../links';

export const createDashboardsNavigationTree = (): NodeDefinition => ({
  id: SecurityPageName.dashboards,
  icon: 'productDashboard',
  link: securityLink(SecurityPageName.dashboards),
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
});
