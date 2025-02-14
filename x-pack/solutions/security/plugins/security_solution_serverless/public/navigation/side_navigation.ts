/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppDeepLinkId, GroupDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import produce from 'immer';
import { map } from 'rxjs';
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
        const management = footerGroup?.children.find((child) => child.link === 'management');
        if (management) {
          management.renderAs = 'panelOpener';
          management.id = 'stack_management';
          management.spaceBefore = null;
          management.children = stackManagementLinks;
          delete management.link;
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
    breadcrumbStatus: 'hidden',
    children: [
      { link: 'management:index_management', breadcrumbStatus: 'hidden' },
      { link: 'management:transform', breadcrumbStatus: 'hidden' },
      { link: 'management:ingest_pipelines', breadcrumbStatus: 'hidden' },
      { link: 'management:dataViews', breadcrumbStatus: 'hidden' },
      { link: 'management:jobsListLink', breadcrumbStatus: 'hidden' },
      { link: 'management:pipelines', breadcrumbStatus: 'hidden' },
      { link: 'management:data_quality', breadcrumbStatus: 'hidden' },
      { link: 'management:data_usage', breadcrumbStatus: 'hidden' },
    ],
  },
  {
    title: i18n.translate('xpack.securitySolutionServerless.navLinks.projectSettings.mngt.access', {
      defaultMessage: 'Access',
    }),
    breadcrumbStatus: 'hidden',
    children: [
      { link: 'management:api_keys', breadcrumbStatus: 'hidden' },
      { link: 'management:roles', breadcrumbStatus: 'hidden' },
      {
        cloudLink: 'userAndRoles',
        title: i18n.translate(
          'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.usersAndRoles',
          { defaultMessage: 'Manage organization members' }
        ),
      },
    ],
  },
  {
    title: i18n.translate(
      'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.alertsAndInsights',
      { defaultMessage: 'Alerts and Insights' }
    ),
    breadcrumbStatus: 'hidden',
    children: [
      { link: 'management:triggersActions', breadcrumbStatus: 'hidden' },
      { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
      { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
      { link: 'securitySolutionUI:entity_analytics-management', breadcrumbStatus: 'hidden' },
      {
        link: 'securitySolutionUI:entity_analytics-entity_store_management',
        breadcrumbStatus: 'hidden',
      },
    ],
  },
  {
    title: i18n.translate(
      'xpack.securitySolutionServerless.navLinks.projectSettings.mngt.content',
      { defaultMessage: 'Content' }
    ),
    breadcrumbStatus: 'hidden',
    children: [
      { link: 'management:spaces', breadcrumbStatus: 'hidden' },
      { link: 'management:objects', breadcrumbStatus: 'hidden' },
      { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
      { link: 'management:reporting', breadcrumbStatus: 'hidden' },
      { link: 'management:tags', breadcrumbStatus: 'hidden' },
      { link: 'maps' },
      { link: 'visualize' },
    ],
  },
  {
    title: i18n.translate('xpack.securitySolutionServerless.navLinks.projectSettings.mngt.other', {
      defaultMessage: 'Other',
    }),
    breadcrumbStatus: 'hidden',
    children: [
      { link: 'management:settings', breadcrumbStatus: 'hidden' },
      { link: 'management:securityAiAssistantManagement', breadcrumbStatus: 'hidden' },
    ],
  },
];
