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
import { ATTACKS_ALERTS_ALIGNMENT_ENABLED } from '../constants';

const LazyIconWorkflow = lazy(() =>
  import('./v2_icons/workflow').then(({ iconWorkflow }) => ({ default: iconWorkflow }))
);

// TODO delete when the `bullseye` EUI icon has been updated
const LazyIconFindings = lazy(() =>
  import('./v2_icons/findings').then(({ iconFindings }) => ({ default: iconFindings }))
);

// TODO delete when the EUI icon has been updated
const LazyIconIntelligence = lazy(() =>
  import('./v2_icons/intelligence').then(({ iconIntelligence }) => ({ default: iconIntelligence }))
);

export const createV2NavigationTree = (core: CoreStart): NodeDefinition[] => [
  {
    link: 'discover',
    icon: 'discoverApp',
  },
  defaultNavigationTree.dashboards(),
  defaultNavigationTree.rules(),
  core.featureFlags.getBooleanValue(ATTACKS_ALERTS_ALIGNMENT_ENABLED, false)
    ? defaultNavigationTree.alertDetections()
    : {
        id: SecurityPageName.alerts,
        icon: 'warning',
        link: securityLink(SecurityPageName.alerts),
      },
  {
    // TODO: update icon from EUI
    icon: LazyIconWorkflow,
    link: 'workflows',
    badgeType: 'techPreview' as const,
  },
  {
    id: SecurityPageName.attackDiscovery,
    icon: 'bolt',
    link: securityLink(SecurityPageName.attackDiscovery),
  },
  {
    id: SecurityPageName.cloudSecurityPostureFindings,
    // TODO change this to the `bullseye` EUI icon when available
    icon: LazyIconFindings,
    link: securityLink(SecurityPageName.cloudSecurityPostureFindings),
  },
  defaultNavigationTree.cases(),
  defaultNavigationTree.entityAnalytics(),
  defaultNavigationTree.explore(),
  defaultNavigationTree.investigations(),
  {
    id: SecurityPageName.threatIntelligence,
    // TODO change this to the `compute` EUI icon when available
    icon: LazyIconIntelligence,
    link: securityLink(SecurityPageName.threatIntelligence),
  },
  {
    id: SecurityPageName.assetInventory,
    icon: 'editorChecklist',
    link: securityLink(SecurityPageName.assetInventory),
  },
  defaultNavigationTree.assets(core),
  defaultNavigationTree.ml(),
];
