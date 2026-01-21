/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { DATA_SOURCES_SHORT_TITLE } from '@kbn/data-sources-plugin/common';
import agentsIcon from './assets/robot.svg';

export const createNavigationTree = (): NavigationTreeDefinition => {
  return {
    body: [
      {
        link: 'workplace_ai',
        title: 'Workplace AI',
        renderAs: 'home',
        breadcrumbStatus: 'hidden',
      },
      {
        icon: agentsIcon, // Temp svg until we have icon in EUI
        link: 'agent_builder',
      },
      {
        link: 'data_sources',
        title: DATA_SOURCES_SHORT_TITLE,
        icon: 'plugs',
        badgeType: 'techPreview',
      },
      {
        link: 'workflows',
      },
      {
        link: 'dashboards',
        getIsActive: ({ pathNameSerialized, prepend }) => {
          return pathNameSerialized.startsWith(prepend('/app/dashboards'));
        },
      },
      {
        link: 'discover',
      },
    ],
    footer: [
      {
        id: 'devTools',
        title: i18n.translate('xpack.serverlessWorkplaceAI.nav.devTools', {
          defaultMessage: 'Developer tools',
        }),
        link: 'dev_tools',
        icon: 'editorCodeBlock',
      },
      {
        id: 'management',
        title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt', {
          defaultMessage: 'Management',
        }),
        icon: 'gear',
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
            title: i18n.translate('xpack.serverlessWorkplaceAI.nav.mngt.alertsAndInsights', {
              defaultMessage: 'Alerts and insights',
            }),
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
  };
};
