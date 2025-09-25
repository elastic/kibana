/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { defaultNavigationTree } from '../../navigation_tree';

import { SecurityPageName } from '../..';
import { securityLink } from '../../links';

const LazyIconBulb = lazy(() =>
  import('./v2_icons/bulb').then(({ iconBulb }) => ({ default: iconBulb }))
);

export const createV2NavigationTree = (core: CoreStart): NodeDefinition[] => [
  defaultNavigationTree.dashboards({ sideNavVersion: 'v2' }),
  defaultNavigationTree.rules({ sideNavVersion: 'v2' }),
  {
    id: SecurityPageName.alerts,
    iconV2: 'warning',
    link: securityLink(SecurityPageName.alerts),
    sideNavVersion: 'v2',
  },
  {
    id: SecurityPageName.attackDiscovery,
    iconV2: 'bolt',
    link: securityLink(SecurityPageName.attackDiscovery),
    sideNavVersion: 'v2',
  },
  defaultNavigationTree.assets(core, { sideNavVersion: 'v2' }),
  defaultNavigationTree.cases({ sideNavVersion: 'v2' }),
  defaultNavigationTree.entityAnalytics({ sideNavVersion: 'v2' }),
  defaultNavigationTree.explore({ sideNavVersion: 'v2' }),
  defaultNavigationTree.investigations({ sideNavVersion: 'v2' }),
  {
    id: SecurityPageName.cloudSecurityPostureFindings,
    iconV2: 'bug',
    link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
    sideNavVersion: 'v2',
  },
  {
    id: SecurityPageName.assetInventory,
    iconV2: 'editorChecklist',
    link: securityLink(SecurityPageName.assetInventory),
    sideNavVersion: 'v2',
  },
  {
    id: SecurityPageName.threatIntelligence,
    iconV2: LazyIconBulb,
    link: securityLink(SecurityPageName.threatIntelligence),
    sideNavVersion: 'v2',
  },
  defaultNavigationTree.ml({ sideNavVersion: 'v2' }),
];
