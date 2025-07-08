/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import { CONNECTORS_LABEL } from '../common/i18n_string';

export const navigationTree = ({ isAppRegistered }: ApplicationStart): NavigationTreeDefinition => {
  function isAvailable<T>(appId: string, content: T): T[] {
    return isAppRegistered(appId) ? [content] : [];
  }

  return {
    body: [
      {
        type: 'navGroup',
        id: 'search_project_nav',
        title: 'Elasticsearch',
        icon: 'logoElasticsearch',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: 'home',
            title: i18n.translate('xpack.serverlessSearch.nav.home', {
              defaultMessage: 'Home',
            }),
            link: 'searchHomepage',
            spaceBefore: 'm',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return (
                pathNameSerialized.startsWith(prepend('/app/elasticsearch/home')) ||
                pathNameSerialized.startsWith(prepend('/app/elasticsearch/start'))
              );
            },
          },
          {
            link: 'discover',
          },
          {
            link: 'dashboards',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dashboards'));
            },
          },
          {
            title: i18n.translate('xpack.serverlessSearch.nav.chat', {
              defaultMessage: 'Chat',
            }),
            renderAs: 'accordion',
            children: [
              {
                link: 'onechat:conversations',
              },
              {
                link: 'onechat:agents',
              },
              {
                link: 'onechat:tools',
              },
            ],
          },
          {
            id: 'build',
            title: i18n.translate('xpack.serverlessSearch.nav.build', {
              defaultMessage: 'Build',
            }),
            spaceBefore: 'm',
            children: [
              {
                title: i18n.translate('xpack.serverlessSearch.nav.content.indices', {
                  defaultMessage: 'Index Management',
                }),
                link: 'elasticsearchIndexManagement',
                breadcrumbStatus:
                  'hidden' /* management sub-pages set their breadcrumbs themselves */,
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return (
                    pathNameSerialized.startsWith(
                      prepend('/app/elasticsearch/index_management/indices')
                    ) || pathNameSerialized.startsWith(prepend('/app/elasticsearch/indices'))
                  );
                },
              },
              ...isAvailable('searchPlayground', {
                id: 'searchPlayground',
                title: i18n.translate('xpack.serverlessSearch.nav.build.searchPlayground', {
                  defaultMessage: 'Playground',
                }),
                link: 'searchPlayground' as AppDeepLinkId,
                breadcrumbStatus: 'hidden' as 'hidden',
              }),
              {
                title: CONNECTORS_LABEL,
                link: 'serverlessConnectors',
              },
            ],
          },
          {
            id: 'relevance',
            title: i18n.translate('xpack.serverlessSearch.nav.relevance', {
              defaultMessage: 'Relevance',
            }),
            spaceBefore: 'm',
            children: [
              {
                id: 'searchSynonyms',
                title: i18n.translate('xpack.serverlessSearch.nav.relevance.searchSynonyms', {
                  defaultMessage: 'Synonyms',
                }),
                link: 'searchSynonyms',
              },
              {
                id: 'searchQueryRules',
                title: i18n.translate('xpack.serverlessSearch.nav.relevance.searchQueryRules', {
                  defaultMessage: 'Query Rules',
                }),
                link: 'searchQueryRules',
              },
              {
                id: 'searchInferenceEndpoints',
                title: i18n.translate(
                  'xpack.serverlessSearch.nav.relevance.searchInferenceEndpoints',
                  {
                    defaultMessage: 'Inference Endpoints',
                  }
                ),
                link: 'searchInferenceEndpoints',
              },
            ],
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navGroup',
        id: 'search_project_nav_footer',
        children: [
          {
            id: 'dev_tools',
            title: i18n.translate('xpack.serverlessSearch.nav.developerTools', {
              defaultMessage: 'Developer Tools',
            }),
            icon: 'console',
            link: 'dev_tools:console',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
            },
          },
          {
            id: 'project_settings_project_nav',
            title: i18n.translate('xpack.serverlessSearch.nav.projectSettings', {
              defaultMessage: 'Project settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'accordion',
            spaceBefore: null,
            children: [
              {
                link: 'management:trained_models',
                title: i18n.translate('xpack.serverlessSearch.nav.trainedModels', {
                  defaultMessage: 'Trained Models',
                }),
              },
              {
                id: 'management',
                title: i18n.translate('xpack.serverlessSearch.nav.mngt', {
                  defaultMessage: 'Management',
                }),
                spaceBefore: null,
                renderAs: 'panelOpener',
                children: [
                  {
                    title: i18n.translate('xpack.serverlessSearch.nav.mngt.data', {
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
                    title: i18n.translate('xpack.serverlessSearch.nav.mngt.access', {
                      defaultMessage: 'Access',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:api_keys', breadcrumbStatus: 'hidden' },
                      { link: 'management:roles', breadcrumbStatus: 'hidden' },
                      {
                        cloudLink: 'userAndRoles',
                        title: i18n.translate(
                          'xpack.serverlessSearch.nav.mngt.access.userAndRoles',
                          {
                            defaultMessage: 'Manage Organization Members',
                          }
                        ),
                      },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessSearch.nav.mngt.alertsAndInsights', {
                      defaultMessage: 'Alerts and insights',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:triggersActionsAlerts', breadcrumbStatus: 'hidden' },
                      { link: 'management:triggersActions', breadcrumbStatus: 'hidden' },
                      { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: 'Machine Learning',
                    children: [{ link: 'management:trained_models', breadcrumbStatus: 'hidden' }],
                  },
                  {
                    title: i18n.translate('xpack.serverlessSearch.nav.mngt.content', {
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
                    title: i18n.translate('xpack.serverlessSearch.nav.mngt.other', {
                      defaultMessage: 'Other',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:settings', breadcrumbStatus: 'hidden' },
                      {
                        link: 'management:observabilityAiAssistantManagement',
                        breadcrumbStatus: 'hidden',
                        title: i18n.translate(
                          'xpack.serverlessSearch.nav.mngt.other.aiAssistantSettings',
                          { defaultMessage: 'AI Assistant Settings' }
                        ),
                      },
                    ],
                  },
                ],
              },
              {
                id: 'cloudLinkDeployment',
                cloudLink: 'deployment',
                title: i18n.translate('xpack.serverlessSearch.nav.performance', {
                  defaultMessage: 'Performance',
                }),
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
