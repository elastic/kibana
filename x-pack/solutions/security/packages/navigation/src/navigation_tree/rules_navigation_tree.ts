/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, RootNodePanelOpenerDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName, SecurityGroupName } from '../constants';
import { SecurityLinkGroup } from '../link_groups';
import { securityLink } from '../links';
import { i18nStrings } from '../i18n_strings';

/**
 * The Detection Rules v2 app, owned by the `securityDetections` plugin. It is
 * referenced by its app id rather than a `securityLink`, because it is a
 * separate plugin's app rather than a Security Solution page.
 *
 * The plugin only registers the app when its `enableDetectionsOnV2` feature
 * flag is on. With the flag off there is no deep link to resolve, and the
 * navigation framework drops this node from the tree, so the entry needs no
 * gating of its own here.
 */
const DETECTIONS_V2_APP_ID = 'securityDetectionsV2' as AppDeepLinkId;

export const createRulesNavigationTree = (): RootNodePanelOpenerDefinition => ({
  id: SecurityGroupName.rules,
  title: SecurityLinkGroup[SecurityGroupName.rules].title,
  icon: 'radar',
  renderAs: 'panelOpener',
  children: [
    {
      title: i18nStrings.rules.management.title,
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: SecurityPageName.rules,
          link: securityLink(SecurityPageName.rules),
          children: [
            {
              id: SecurityPageName.rulesManagement,
              link: securityLink(SecurityPageName.rulesManagement),
            },
            {
              id: SecurityPageName.rulesAdd,
              link: securityLink(SecurityPageName.rulesAdd),
            },
            {
              id: SecurityPageName.rulesCreate,
              link: securityLink(SecurityPageName.rulesCreate),
            },
          ],
        },
        {
          id: DETECTIONS_V2_APP_ID,
          link: DETECTIONS_V2_APP_ID,
          title: i18nStrings.rules.management.detectionRulesV2,
        },
        {
          id: SecurityPageName.cloudSecurityPostureBenchmarks,
          link: securityLink(SecurityPageName.cloudSecurityPostureBenchmarks),
        },
        {
          id: SecurityPageName.exceptions,
          link: securityLink(SecurityPageName.exceptions),
        },
        {
          id: SecurityPageName.alertAnalysisWorkflow,
          link: securityLink(SecurityPageName.alertAnalysisWorkflow),
        },
      ],
    },
    {
      title: i18nStrings.rules.management.discover,
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: SecurityPageName.coverageOverview,
          link: securityLink(SecurityPageName.coverageOverview),
        },
      ],
    },
  ],
});
