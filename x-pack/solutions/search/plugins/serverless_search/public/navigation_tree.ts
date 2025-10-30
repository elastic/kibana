/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AppDeepLinkId, NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { i18n } from '@kbn/i18n';

const LazyIconAgents = lazy(() =>
  import('@kbn/search-shared-ui/src/v2_icons/robot').then((m) => ({ default: m.iconRobot }))
);

const LazyIconPlayground = lazy(() =>
  import('@kbn/search-shared-ui/src/v2_icons/playground').then((m) => ({
    default: m.iconPlayground,
  }))
);

const NAV_TITLE = i18n.translate('xpack.serverlessSearch.nav.title', {
  defaultMessage: 'Elasticsearch',
});
const PERFORMANCE_TITLE = i18n.translate('xpack.serverlessSearch.nav.performance', {
  defaultMessage: 'Performance',
});
const ALERTS_AND_INSIGHTS_TITLE = i18n.translate(
  'xpack.serverlessSearch.nav.mngt.alertsAndInsights',
  {
    defaultMessage: 'Alerts and insights',
  }
);
const MACHINE_LEARNING_TITLE = i18n.translate('xpack.serverlessSearch.nav.machineLearning', {
  defaultMessage: 'Machine Learning',
});
const ACCESS_TITLE = i18n.translate('xpack.serverlessSearch.nav.mngt.access', {
  defaultMessage: 'Access',
});
const CONTENT_TITLE = i18n.translate('xpack.serverlessSearch.nav.mngt.content', {
  defaultMessage: 'Content',
});

const OTHER_TITLE = i18n.translate('xpack.serverlessSearch.nav.mngt.other', {
  defaultMessage: 'Other',
});
const AI_TITLE = i18n.translate('xpack.serverlessSearch.nav.adminAndSettings.ai.title', {
  defaultMessage: 'AI',
});

export const navigationTree = ({ isAppRegistered }: ApplicationStart): NavigationTreeDefinition => {
  function isAvailable<T>(appId: string, content: T): T[] {
    return isAppRegistered(appId) ? [content] : [];
  }

  return {
    body: [
      {
        type: 'navGroup',
        id: 'search_project_nav',
        title: NAV_TITLE,
        icon: 'logoElasticsearch',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            icon: 'logoElasticsearch',
            link: 'searchHomepage',
            renderAs: 'home',
            sideNavVersion: 'v2',
            title: NAV_TITLE,
            breadcrumbStatus: 'hidden',
          },
          {
            id: 'home',
            title: i18n.translate('xpack.serverlessSearch.nav.home', {
              defaultMessage: 'Home',
            }),
            link: 'searchHomepage',
            spaceBefore: 'm',
            sideNavVersion: 'v1',
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
            iconV2: LazyIconAgents, // Temp svg until we have icon in EUI
            link: 'agent_builder',
            withBadge: true,
            badgeTypeV2: 'techPreview',
          },
          {
            link: 'workflows',
            withBadge: true,
            badgeTypeV2: 'techPreview' as const,
            badgeOptions: {
              icon: 'beaker',
              tooltip: i18n.translate('xpack.serverlessSearch.nav.workflowsBadgeTooltip', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              }),
            },
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
                sideNavVersion: 'v1', // Moved to sub-navigation in v2
              },
              ...isAvailable('searchPlayground', {
                id: 'searchPlayground',
                title: i18n.translate('xpack.serverlessSearch.nav.build.searchPlayground', {
                  defaultMessage: 'Playground',
                }),
                link: 'searchPlayground' as AppDeepLinkId,
                breadcrumbStatus: 'hidden' as 'hidden',
                iconV2: LazyIconPlayground, // Temp svg until we have icon in EUI
              }),
            ],
          },
          {
            id: 'relevance',
            title: i18n.translate('xpack.serverlessSearch.nav.relevance', {
              defaultMessage: 'Relevance',
            }),
            sideNavVersion: 'v1',
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
                  defaultMessage: 'Query rules',
                }),
                link: 'searchQueryRules',
              },
              {
                id: 'searchInferenceEndpoints',
                title: i18n.translate(
                  'xpack.serverlessSearch.nav.relevance.searchInferenceEndpoints',
                  {
                    defaultMessage: 'Inference endpoints',
                  }
                ),
                link: 'searchInferenceEndpoints',
              },
            ],
          },
          {
            children: [
              {
                id: 'ml_overview',
                title: '',
                children: [{ link: 'ml:overview' }, { link: 'ml:dataVisualizer' }],
              },
              {
                id: 'category-anomaly_detection',
                title: i18n.translate(
                  'xpack.serverlessSearch.nav.machineLearning.anomalyDetection',
                  {
                    defaultMessage: 'Anomaly detection',
                  }
                ),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'ml:anomalyExplorer' }, { link: 'ml:singleMetricViewer' }],
              },
              {
                id: 'category-data_frame analytics',
                title: i18n.translate(
                  'xpack.serverlessSearch.nav.machineLearning.dataFrameAnalytics',
                  {
                    defaultMessage: 'Data frame analytics',
                  }
                ),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'ml:resultExplorer' }, { link: 'ml:analyticsMap' }],
              },
              {
                id: 'category-aiops_labs',
                title: i18n.translate('xpack.serverlessSearch.nav.machineLearning.aiops_labs', {
                  defaultMessage: 'AIOps labs',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'ml:logRateAnalysis' },
                  { link: 'ml:logPatternAnalysis' },
                  { link: 'ml:changePointDetections' },
                ],
              },
            ],
            iconV2: 'machineLearningApp',
            id: 'machine_learning',
            renderAs: 'panelOpener',
            sideNavVersion: 'v2',
            title: MACHINE_LEARNING_TITLE,
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
            id: 'getting_started',
            icon: 'launch',
            link: 'searchGettingStarted',
          },
          {
            id: 'dev_tools',
            title: i18n.translate('xpack.serverlessSearch.nav.developerTools', {
              defaultMessage: 'Developer Tools',
            }),
            icon: 'console',
            iconV2: 'code',
            link: 'dev_tools:console',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
            },
          },
          {
            children: [
              {
                children: [
                  {
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return (
                        pathNameSerialized.startsWith(
                          prepend('/app/elasticsearch/index_management/indices')
                        ) ||
                        pathNameSerialized.startsWith(
                          prepend('/app/management/data/index_management')
                        )
                      );
                    },
                    link: 'management:index_management',
                    breadcrumbStatus: 'hidden',
                  },
                  { link: 'management:index_lifecycle_management', breadcrumbStatus: 'hidden' },
                  { link: 'management:snapshot_restore', breadcrumbStatus: 'hidden' },
                  { link: 'management:transform', breadcrumbStatus: 'hidden' },
                  { link: 'management:rollup_jobs', breadcrumbStatus: 'hidden' },
                  { link: 'management:data_quality', breadcrumbStatus: 'hidden' },
                  { link: 'management:data_usage', breadcrumbStatus: 'hidden' },
                ],
                title: i18n.translate('xpack.serverlessSearch.nav.ingest.indices.title', {
                  defaultMessage: 'Indices and data streams',
                }),
              },
              {
                children: [
                  { link: 'management:ingest_pipelines', breadcrumbStatus: 'hidden' },
                  { link: 'management:pipelines', breadcrumbStatus: 'hidden' },
                ],
                title: i18n.translate('xpack.serverlessSearch.nav.ingest.pipelines.title', {
                  defaultMessage: 'Ingest',
                }),
              },
              {
                children: [
                  { link: 'searchSynonyms:synonyms', breadcrumbStatus: 'hidden' },
                  { link: 'searchQueryRules' },
                ],
                id: 'search_relevance',
                breadcrumbStatus: 'hidden',
                title: i18n.translate('xpack.serverlessSearch.nav.ingest.relevance.title', {
                  defaultMessage: 'Relevance',
                }),
              },
            ],
            iconV2: 'database',
            id: DATA_MANAGEMENT_NAV_ID, // important for tour
            sideNavVersion: 'v2',
            renderAs: 'panelOpener',
            title: i18n.translate('xpack.serverlessSearch.nav.dataManagement', {
              defaultMessage: 'Data management',
            }),
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
                    title: ACCESS_TITLE,
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:api_keys', breadcrumbStatus: 'hidden' },
                      { link: 'management:roles', breadcrumbStatus: 'hidden' },
                      {
                        cloudLink: 'userAndRoles',
                      },
                    ],
                  },
                  {
                    title: ALERTS_AND_INSIGHTS_TITLE,
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:triggersActionsAlerts', breadcrumbStatus: 'hidden' },
                      { link: 'management:triggersActions', breadcrumbStatus: 'hidden' },
                      { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: MACHINE_LEARNING_TITLE,
                    children: [{ link: 'management:trained_models', breadcrumbStatus: 'hidden' }],
                  },
                  {
                    title: AI_TITLE,
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
                    title: CONTENT_TITLE,
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:dataViews' },
                      { link: 'management:spaces', breadcrumbStatus: 'hidden' },
                      { link: 'management:objects', breadcrumbStatus: 'hidden' },
                      { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
                      { link: 'management:reporting', breadcrumbStatus: 'hidden' },
                      { link: 'management:tags', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: OTHER_TITLE,
                    breadcrumbStatus: 'hidden',
                    children: [{ link: 'management:settings', breadcrumbStatus: 'hidden' }],
                  },
                ],
              },
              {
                id: 'cloudLinkDeployment',
                cloudLink: 'deployment',
                title: PERFORMANCE_TITLE,
              },
              {
                id: 'cloudLinkBilling',
                cloudLink: 'billingAndSub',
              },
            ],
            sideNavVersion: 'v1',
          },
          {
            id: 'admin_and_settings',
            title: i18n.translate('xpack.serverlessSearch.nav.adminAndSettings', {
              defaultMessage: 'Admin and Settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'panelOpener',
            sideNavVersion: 'v2',
            children: [
              {
                id: 'settings_access',
                title: ACCESS_TITLE,
                children: [
                  { link: 'management:api_keys', breadcrumbStatus: 'hidden' },
                  { link: 'management:roles', breadcrumbStatus: 'hidden' },
                ],
              },
              {
                id: 'organization',
                title: i18n.translate('xpack.serverlessSearch.nav.adminAndSettings.org.title', {
                  defaultMessage: 'Organization',
                }),
                children: [
                  {
                    id: 'cloudLinkBilling',
                    cloudLink: 'billingAndSub',
                  },
                  {
                    id: 'cloudLinkDeployment',
                    cloudLink: 'deployment',
                    title: PERFORMANCE_TITLE,
                  },
                  {
                    cloudLink: 'userAndRoles',
                  },
                ],
              },
              {
                id: 'settings_alerts',
                title: ALERTS_AND_INSIGHTS_TITLE,
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'management:triggersActionsAlerts', breadcrumbStatus: 'hidden' },
                  { link: 'management:triggersActions', breadcrumbStatus: 'hidden' },
                  { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                ],
              },
              {
                id: 'settings_ml',
                title: MACHINE_LEARNING_TITLE,
                children: [
                  { link: 'management:trained_models', breadcrumbStatus: 'hidden' },
                  {
                    id: 'searchInferenceEndpoints',
                    link: 'searchInferenceEndpoints',
                    breadcrumbStatus: 'hidden',
                  },
                  { link: 'management:anomaly_detection' },
                  { link: 'management:analytics' },
                ],
              },
              {
                id: 'settings_ai',
                title: AI_TITLE,
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
                id: 'settings_content',
                title: CONTENT_TITLE,
                children: [
                  { link: 'management:dataViews', breadcrumbStatus: 'hidden' },
                  { link: 'management:spaces', breadcrumbStatus: 'hidden' },
                  { link: 'visualize' },
                  { link: 'management:objects', breadcrumbStatus: 'hidden' },
                  { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
                  { link: 'management:reporting', breadcrumbStatus: 'hidden' },
                  { link: 'management:tags', breadcrumbStatus: 'hidden' },
                ],
              },
              {
                title: i18n.translate(
                  'xpack.serverlessSearch.nav.adminAndSettings.settings.title',
                  {
                    defaultMessage: 'Settings',
                  }
                ),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:settings', breadcrumbStatus: 'hidden' }],
              },
              {
                // We include this link here to ensure that sidenav panel opens when user lands to legacy management landing page
                // https://github.com/elastic/kibana/issues/240275
                link: 'management',
                sideNavStatus: 'hidden',
              },
            ],
          },
        ],
      },
    ],
  };
};
