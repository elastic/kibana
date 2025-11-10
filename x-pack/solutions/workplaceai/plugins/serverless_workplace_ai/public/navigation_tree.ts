/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { DATA_CONNECTORS_SHORT_TITLE } from '@kbn/data-connectors-plugin/common';
import agentsIcon from './assets/robot.svg';

export const createNavigationTree = (): NavigationTreeDefinition => {
  return {
    body: [
      {
        type: 'navGroup',
        id: 'workplace_ai_project_nav',
        title: 'Workplace AI',
        icon: 'logoElasticsearch',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            link: 'workplace_ai',
            title: 'Workplace AI',
            renderAs: 'home',
            breadcrumbStatus: 'hidden',
          },
          {
            iconV2: agentsIcon, // Temp svg until we have icon in EUI
            link: 'agent_builder',
            withBadge: true,
            badgeTypeV2: 'techPreview',
          },
          {
            link: 'data_connectors',
            title: DATA_CONNECTORS_SHORT_TITLE,
            iconV2: 'plugs',
            badgeTypeV2: 'techPreview',
          },
          {
            link: 'workflows',
            withBadge: true,
            badgeTypeV2: 'techPreview' as const,
            badgeOptions: {
              icon: 'beaker',
              tooltip: i18n.translate('xpack.serverlessWorkplaceAI.nav.workflowsBadgeTooltip', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              }),
            },
          },
          {
            link: 'dashboards',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dashboards'));
            },
          },
          {
            link: 'discover',
            spaceBefore: 'l',
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navGroup',
        id: 'workplace_ai_project_nav_footer',
        children: [
          {
            id: 'devTools',
            title: i18n.translate('xpack.serverlessWorkplaceAI.nav.devTools', {
              defaultMessage: 'Developer tools',
            }),
            link: 'dev_tools',
            icon: 'editorCodeBlock',
          },
          {
            id: 'project_settings_project_nav',
            title: i18n.translate('xpack.serverlessWorkplaceAI.nav.projectSettings', {
              defaultMessage: 'Project settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'accordion',
            spaceBefore: null,
            children: [
              {
                id: 'management',
                title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt', {
                  defaultMessage: 'Management',
                }),
                renderAs: 'panelOpener',
                children: [
                  {
                    title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt.data', {
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
                    title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt.access', {
                      defaultMessage: 'Access',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [{ link: 'management:api_keys', breadcrumbStatus: 'hidden' }],
                  },
                  {
                    title: i18n.translate(
                      'xpack.serverlessWorkplaceAI.nav.mngt.alertsAndInsights',
                      {
                        defaultMessage: 'Alerts and insights',
                      }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                      { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt.ai', {
                      defaultMessage: 'AI',
                    }),
                    children: [
                      { link: 'management:genAiSettings', breadcrumbStatus: 'hidden' },
                      { link: 'management:agentBuilder', breadcrumbStatus: 'hidden' },
                      {
                        link: 'management:observabilityAiAssistantManagement',
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt.content', {
                      defaultMessage: 'Content',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:spaces', breadcrumbStatus: 'hidden' },
                      { link: 'management:objects', breadcrumbStatus: 'hidden' },
                      { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
                      { link: 'management:reporting', breadcrumbStatus: 'hidden' },
                      { link: 'management:tags', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt.other', {
                      defaultMessage: 'Other',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [{ link: 'management:settings', breadcrumbStatus: 'hidden' }],
                  },
                ],
              },
              {
                id: 'cloudLinkUserAndRoles',
                cloudLink: 'userAndRoles',
              },
              {
                id: 'cloudLinkBilling',
                cloudLink: 'billingAndSub',
              },
            ],
          },
        ],
      },
    ],
  };
};
