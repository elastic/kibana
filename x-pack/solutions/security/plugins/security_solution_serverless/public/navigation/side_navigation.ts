/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import produce from 'immer';
import { i18n } from '@kbn/i18n';
import type { AppDeepLinkId, GroupDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { type Services } from '../common/services';

const PROJECT_SETTINGS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.navLinks.projectSettings.title',
  { defaultMessage: 'Project Settings' }
);

export const initSideNavigation = async (services: Services) => {
  services.securitySolution.setIsSolutionNavigationEnabled(true);

  const { navigationTree$, panelContentProvider } =
    await services.securitySolution.getSolutionNavigation();

  const serverlessNavigationTree$ = navigationTree$.pipe(
    map((navigationTree) =>
      produce(navigationTree, (draft) => {
        // Adds serverless cloud links to the footer group ("Product settings" dropdown)
        const footerGroup: GroupDefinition | undefined = draft.footer?.find(
          ({ type }) => type === 'navGroup'
        ) as GroupDefinition;
        // Adds children for Stack Management panel
        const management = footerGroup?.children.find((child) => child.link === 'management');
        if (management) {
          management.renderAs = 'panelOpener';
          management.id = 'stack_management';
          management.spaceBefore = null;
          management.children = stackManagementLinks;
          delete management.link; // no landing page for stack management
        }
        if (footerGroup) {
          footerGroup.title = PROJECT_SETTINGS_TITLE;
          footerGroup.children.push({ cloudLink: 'billingAndSub', openInNewTab: true });
        }
      })
    )
  );

  services.serverless.initNavigation('security', serverlessNavigationTree$, {
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  });
};

// Stack Management static node definition
const stackManagementLinks: Array<NodeDefinition<AppDeepLinkId, string, string>> = [
  {
    title: i18n.translate('xpack.securitySolutionServerless.navLinks.projectSettings.mngt.data', {
      defaultMessage: 'Data',
    }),
    children: [{ link: 'management:data_quality' }],
  },
  {
    title: i18n.translate('xpack.securitySolutionServerless.navLinks.projectSettings.mngt.access', {
      defaultMessage: 'Access',
    }),
    children: [{ cloudLink: 'userAndRoles' }],
  },
  {
    title: i18n.translate(
      'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.alertsAndInsights',
      { defaultMessage: 'Alerts and Insights' }
    ),
    children: [
      { link: 'management:triggersActions' },
      { link: 'management:triggersActionsConnectors' },
      { link: 'securitySolutionUI:entity_analytics-management' },
      { link: 'securitySolutionUI:entity_analytics-entity_store_management' },
    ],
  },
  {
    title: i18n.translate(
      'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.content',
      { defaultMessage: 'Content' }
    ),
    children: [{ link: 'maps' }, { link: 'visualize' }],
  },
  {
    title: i18n.translate('xpack.securitySolutionServerless.navLinks.projectSettings.mngt.other', {
      defaultMessage: 'Other',
    }),
    children: [{ link: 'management:securityAiAssistantManagement' }],
  },
];
