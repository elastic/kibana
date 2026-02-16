/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Location } from 'history';

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { i18n } from '@kbn/i18n';

function isEditingFromDashboard(
  location: Location,
  pathNameSerialized: string,
  prepend: (path: string) => string
): boolean {
  const vizApps = ['/app/visualize', '/app/maps', '/app/lens'];
  const isVizApp = vizApps.some((app) => pathNameSerialized.startsWith(prepend(app)));
  const hasOriginatingApp =
    location.search.includes('originatingApp=dashboards') ||
    location.hash.includes('originatingApp=dashboards');
  return isVizApp && hasOriginatingApp;
}

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

const AI_TITLE = i18n.translate('xpack.serverlessSearch.nav.adminAndSettings.ai.title', {
  defaultMessage: 'AI',
});

export function createNavigationTree({
  isAppRegistered,
  showAiAssistant = true,
}: ApplicationStart & { showAiAssistant?: boolean }): NavigationTreeDefinition {
  return {
    body: [
      {
        icon: 'logoElasticsearch',
        link: 'searchHomepage',
        renderAs: 'home',
        title: NAV_TITLE,
        breadcrumbStatus: 'hidden',
      },
      {
        link: 'discover',
        icon: 'productDiscover',
      },
      {
        link: 'dashboards',
        icon: 'productDashboard',
        getIsActive: ({ pathNameSerialized, prepend, location }) =>
          pathNameSerialized.startsWith(prepend('/app/dashboards')) ||
          isEditingFromDashboard(location, pathNameSerialized, prepend),
      },
      {
        icon: 'productAgent',
        link: 'agent_builder',
      },
      {
        link: 'workflows',
      },
      {
        children: [
          {
            id: 'ml_overview',
            title: '',
            children: [
              { link: 'ml:overview' },
              { link: 'ml:dataVisualizer' },
              { link: 'ml:dataDrift', sideNavStatus: 'hidden' },
              { link: 'ml:dataDriftPage', sideNavStatus: 'hidden' },
              { link: 'ml:fileUpload', sideNavStatus: 'hidden' },
              { link: 'ml:indexDataVisualizer', sideNavStatus: 'hidden' },
              { link: 'ml:indexDataVisualizerPage', sideNavStatus: 'hidden' },
            ],
          },
          {
            id: 'category-anomaly_detection',
            title: i18n.translate('xpack.serverlessSearch.nav.machineLearning.anomalyDetection', {
              defaultMessage: 'Anomaly detection',
            }),
            breadcrumbStatus: 'hidden',
            children: [{ link: 'ml:anomalyExplorer' }, { link: 'ml:singleMetricViewer' }],
          },
          {
            id: 'category-data_frame analytics',
            title: i18n.translate('xpack.serverlessSearch.nav.machineLearning.dataFrameAnalytics', {
              defaultMessage: 'Data frame analytics',
            }),
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
              { link: 'ml:logRateAnalysisPage', sideNavStatus: 'hidden' },
              { link: 'ml:logPatternAnalysis' },
              { link: 'ml:logPatternAnalysisPage', sideNavStatus: 'hidden' },
              { link: 'ml:changePointDetections' },
              { link: 'ml:changePointDetectionsPage', sideNavStatus: 'hidden' },
            ],
          },
        ],
        icon: 'productML',
        id: 'machine_learning',
        renderAs: 'panelOpener',
        title: MACHINE_LEARNING_TITLE,
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
                    pathNameSerialized.startsWith(prepend('/app/management/data/index_management'))
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
              { link: 'searchPlayground' },
            ],
            id: 'search_relevance',
            breadcrumbStatus: 'hidden',
            title: i18n.translate('xpack.serverlessSearch.nav.ingest.relevance.title', {
              defaultMessage: 'Relevance',
            }),
          },
        ],
        icon: 'database',
        id: DATA_MANAGEMENT_NAV_ID, // important for tour
        renderAs: 'panelOpener',
        title: i18n.translate('xpack.serverlessSearch.nav.dataManagement', {
          defaultMessage: 'Data management',
        }),
      },
    ],
    footer: [
      {
        id: 'search_getting_started',
        icon: 'launch',
        link: 'searchGettingStarted',
      },
      {
        id: 'dev_tools',
        title: i18n.translate('xpack.serverlessSearch.nav.developerTools', {
          defaultMessage: 'Developer Tools',
        }),
        icon: 'code',
        link: 'dev_tools:console',
        getIsActive: ({ pathNameSerialized, prepend }) => {
          return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
        },
      },
      {
        id: 'admin_and_settings',
        title: i18n.translate('xpack.serverlessSearch.nav.adminAndSettings', {
          defaultMessage: 'Admin and Settings',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        renderAs: 'panelOpener',
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
              ...(showAiAssistant
                ? [
                    {
                      link: 'management:observabilityAiAssistantManagement' as const,
                      breadcrumbStatus: 'hidden' as const,
                    },
                  ]
                : []),
            ],
          },
          {
            id: 'settings_content',
            title: CONTENT_TITLE,
            children: [
              { link: 'management:dataViews', breadcrumbStatus: 'hidden' },
              { link: 'management:spaces', breadcrumbStatus: 'hidden' },
              { link: 'management:objects', breadcrumbStatus: 'hidden' },
              { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
              { link: 'management:reporting', breadcrumbStatus: 'hidden' },
              { link: 'management:tags', breadcrumbStatus: 'hidden' },
            ],
          },
          {
            title: i18n.translate('xpack.serverlessSearch.nav.adminAndSettings.settings.title', {
              defaultMessage: 'Settings',
            }),
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
  };
}

export const navigationTree = (application: ApplicationStart): NavigationTreeDefinition => {
  return createNavigationTree(application);
};
