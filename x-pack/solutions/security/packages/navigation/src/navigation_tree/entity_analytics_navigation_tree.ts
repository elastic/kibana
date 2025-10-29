/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { lazy } from 'react';
import { SecurityGroupName, SecurityPageName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';

const LazyIconEntityAnalytics = lazy(() =>
  import('./v2_icons/entity_analytics').then(({ iconEntityAnalytics }) => ({
    default: iconEntityAnalytics,
  }))
);

export const createEntityAnalyticsNavigationTree = (
  { sideNavVersion }: { sideNavVersion?: NodeDefinition['sideNavVersion'] } = {
    sideNavVersion: 'v1',
  }
): NodeDefinition => ({
  id: SecurityGroupName.entityAnalytics,
  iconV2: LazyIconEntityAnalytics,
  title: SecurityLinkGroup[SecurityGroupName.entityAnalytics].title,
  renderAs: 'panelOpener',
  sideNavVersion,
  children: [
    {
      id: SecurityPageName.entityAnalyticsOverview,
      link: securityLink(SecurityPageName.entityAnalyticsOverview),
    },
    {
      id: SecurityPageName.entityAnalyticsPrivilegedUserMonitoring,
      link: securityLink(SecurityPageName.entityAnalyticsPrivilegedUserMonitoring),
    },
  ],
});
