/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityGroupName, SecurityPageName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';

export const createEntityAnalyticsNavigationTree = (): NodeDefinition => ({
  id: SecurityGroupName.entityAnalytics,
  icon: 'chartBarVerticalStack',
  title: SecurityLinkGroup[SecurityGroupName.entityAnalytics].title,
  renderAs: 'panelOpener',
  children: [
    {
      id: SecurityPageName.entityAnalyticsOverview,
      link: securityLink(SecurityPageName.entityAnalyticsOverview),
    },
    {
      id: SecurityPageName.entityAnalyticsPrivilegedUserMonitoring,
      link: securityLink(SecurityPageName.entityAnalyticsPrivilegedUserMonitoring),
    },
    {
      id: SecurityPageName.entityAnalyticsThreatHunting,
      link: securityLink(SecurityPageName.entityAnalyticsThreatHunting),
    },
    {
      id: SecurityPageName.entityAnalyticsWatchlists,
      link: securityLink(SecurityPageName.entityAnalyticsWatchlists),
    },
  ],
});
