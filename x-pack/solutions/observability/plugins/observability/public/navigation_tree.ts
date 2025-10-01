/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';
import { STACK_MANAGEMENT_NAV_ID, DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import { lazy } from 'react';
import { map, of } from 'rxjs';
import type { ObservabilityPublicPluginsStart } from './plugin';
const LazyIconBriefcase = lazy(() =>
  import('./v2_icons/briefcase').then(({ iconBriefcase }) => ({ default: iconBriefcase }))
);
const LazyIconMl = lazy(() =>
  import('./v2_icons/product_ml').then(({ iconProductMl }) => ({ default: iconProductMl }))
);
const LazyIconProductStreamsWired = lazy(() =>
  import('./v2_icons/product_streams_wired').then(({ iconProductStreamsWired }) => ({
    default: iconProductStreamsWired,
  }))
);
const LazyIconProductCloudInfra = lazy(() =>
  import('./v2_icons/product_cloud_infra').then(({ iconProductCloudInfra }) => ({
    default: iconProductCloudInfra,
  }))
);

const title = i18n.translate(
  'xpack.observability.obltNav.headerSolutionSwitcher.obltSolutionTitle',
  {
    defaultMessage: 'Observability',
  }
);
const icon = 'logoObservability';

function createNavTree({ streamsAvailable }: { streamsAvailable?: boolean }) {
  const navTree: NavigationTreeDefinition = {
    body: [
      {
        type: 'navGroup',
        id: 'observability_project_nav',
        title,
        icon,
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            link: 'observability-overview',
            title,
            icon,
            renderAs: 'home',
            sideNavVersion: 'v2',
          },
          {
            link: 'observability-overview',
            sideNavVersion: 'v1',
          },
          {
            title: i18n.translate('xpack.observability.obltNav.discover', {
              defaultMessage: 'Discover',
            }),
            link: 'discover',
          },
          {
            link: 'dashboards',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dashboards'));
            },
          },
          {
            link: 'workflows',
            withBadge: true,
            badgeTypeV2: 'techPreview' as const,
            badgeOptions: {
              icon: 'beaker',
              tooltip: i18n.translate('xpack.observability.nav.workflowsBadgeTooltip', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              }),
            },
          },
          {
            link: 'observability-overview:alerts',
            iconV2: 'warning',
          },
          {
            link: 'observability-overview:cases',
            renderAs: 'item',
            children: [
              {
                link: 'observability-overview:cases_configure',
              },
              {
                link: 'observability-overview:cases_create',
              },
            ],
            iconV2: LazyIconBriefcase,
          },
          {
            link: 'slo',
            iconV2: 'visGauge',
          },
          ...(streamsAvailable
            ? [
                {
                  link: 'streams' as const,
                  iconV2: LazyIconProductStreamsWired,
                },
              ]
            : []),
          {
            id: 'applications',
            title: i18n.translate('xpack.observability.obltNav.applications', {
              defaultMessage: 'Applications',
            }),
            renderAs: 'panelOpener',
            spaceBefore: null,
            iconV2: 'spaces',
            children: [
              {
                id: 'apm',
                children: [
                  {
                    link: 'apm:service-map',
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return pathNameSerialized.startsWith(prepend('/app/apm/service-map'));
                    },
                    sideNavStatus: 'hidden',
                  },
                  {
                    link: 'apm:service-groups-list',
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return pathNameSerialized.startsWith(prepend('/app/apm/service-groups'));
                    },
                    sideNavStatus: 'hidden',
                  },
                  {
                    link: 'apm:services',
                    getIsActive: ({ pathNameSerialized }) => {
                      const regex = /app\/apm\/.*service.*/;
                      return regex.test(pathNameSerialized);
                    },
                  },
                  {
                    link: 'apm:traces',
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return pathNameSerialized.startsWith(prepend('/app/apm/traces'));
                    },
                  },
                  {
                    link: 'apm:dependencies',
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return pathNameSerialized.startsWith(prepend('/app/apm/dependencies'));
                    },
                  },
                  {
                    link: 'ux',
                    title: i18n.translate('xpack.observability.obltNav.apm.ux', {
                      defaultMessage: 'User experience',
                    }),
                  },
                ],
              },
              {
                id: 'synthetics',
                title: i18n.translate('xpack.observability.obltNav.apm.syntheticsGroupTitle', {
                  defaultMessage: 'Synthetics',
                }),
                children: [
                  {
                    link: 'synthetics',
                    title: i18n.translate('xpack.observability.obltNav.apm.synthetics.monitors', {
                      defaultMessage: 'Monitors',
                    }),
                  },
                  {
                    link: 'synthetics:certificates',
                    title: i18n.translate(
                      'xpack.observability.obltNav.apm.synthetics.tlsCertificates',
                      {
                        defaultMessage: 'TLS certificates',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'uptime',
                title: i18n.translate('xpack.observability.obltNav.apm.uptimeGroupTitle', {
                  defaultMessage: 'Uptime',
                }),
                children: [
                  {
                    link: 'uptime',
                    title: i18n.translate('xpack.observability.obltNav.apm.uptime.monitors', {
                      defaultMessage: 'Uptime monitors',
                    }),
                  },
                  {
                    link: 'uptime:Certificates',
                    title: i18n.translate(
                      'xpack.observability.obltNav.apm.uptime.tlsCertificates',
                      {
                        defaultMessage: 'TLS certificates',
                      }
                    ),
                  },
                ],
              },
            ],
          },
          {
            id: 'metrics',
            link: 'metrics:inventory',
            title: i18n.translate('xpack.observability.obltNav.infrastructure', {
              defaultMessage: 'Infrastructure',
            }),
            renderAs: 'panelOpener',
            spaceBefore: null,
            iconV2: LazyIconProductCloudInfra,
            children: [
              {
                children: [
                  {
                    link: 'metrics:inventory',
                    title: i18n.translate('xpack.observability.infrastructure.inventory', {
                      defaultMessage: 'Infrastructure inventory',
                    }),
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return pathNameSerialized.startsWith(prepend('/app/metrics/inventory'));
                    },
                  },
                  {
                    link: 'metrics:hosts',
                    getIsActive: ({ pathNameSerialized, prepend }) => {
                      return pathNameSerialized.startsWith(prepend('/app/metrics/hosts'));
                    },
                  },
                  {
                    link: 'metrics:metrics-explorer',
                    title: i18n.translate(
                      'xpack.observability.obltNav.infrastructure.metricsExplorer',
                      {
                        defaultMessage: 'Metrics explorer',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'profiling',
                title: i18n.translate(
                  'xpack.observability.obltNav.infrastructure.universalProfiling',
                  {
                    defaultMessage: 'Universal Profiling',
                  }
                ),
                children: [
                  {
                    link: 'profiling:stacktraces',
                  },
                  {
                    link: 'profiling:flamegraphs',
                  },
                  {
                    link: 'profiling:functions',
                  },
                ],
              },
            ],
          },
          {
            id: 'aiAssistantContainer',
            title: i18n.translate('xpack.observability.obltNav.aiAssistant', {
              defaultMessage: 'AI Assistant',
            }),
            iconV2: 'sparkles',
            link: 'observabilityAIAssistant',
          },
          {
            id: 'machine_learning-landing',
            title: i18n.translate('xpack.observability.obltNav.machineLearning', {
              defaultMessage: 'Machine Learning',
            }),
            spaceBefore: null,
            renderAs: 'panelOpener',
            iconV2: LazyIconMl,
            children: [
              {
                title: '',
                children: [
                  {
                    link: 'ml:overview',
                  },
                  {
                    link: 'ml:dataVisualizer',
                  },
                ],
              },
              {
                id: 'category-anomaly_detection',
                title: i18n.translate('xpack.observability.obltNav.ml.anomaly_detection', {
                  defaultMessage: 'Anomaly detection',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:anomalyExplorer',
                  },
                  {
                    link: 'ml:singleMetricViewer',
                  },
                ],
              },
              {
                id: 'category-data_frame analytics',
                title: i18n.translate('xpack.observability.obltNav.ml.data_frame_analytics', {
                  defaultMessage: 'Data frame analytics',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:resultExplorer',
                  },
                  {
                    link: 'ml:analyticsMap',
                  },
                ],
              },
              {
                id: 'category-aiops_labs',
                title: i18n.translate('xpack.observability.obltNav.ml.aiops_labs', {
                  defaultMessage: 'AIOps labs',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:logRateAnalysis',
                  },
                  {
                    link: 'ml:logPatternAnalysis',
                  },
                  {
                    link: 'ml:changePointDetections',
                  },
                ],
              },
            ],
          },
          {
            id: 'otherTools',
            title: i18n.translate('xpack.observability.obltNav.otherTools', {
              defaultMessage: 'Other tools',
            }),
            spaceBefore: null,
            renderAs: 'panelOpener',
            iconV2: 'wrench',
            children: [
              {
                link: 'logs:anomalies',
                title: i18n.translate('xpack.observability.obltNav.otherTools.logsAnomalies', {
                  defaultMessage: 'Logs anomalies',
                }),
              },
              {
                link: 'logs:log-categories',
                title: i18n.translate('xpack.observability.obltNav.otherTools.logsCategories', {
                  defaultMessage: 'Logs categories',
                }),
              },
              { link: 'maps' },
              { link: 'graph' },
              {
                link: 'visualize',
                title: i18n.translate('xpack.observability.obltNav.otherTools.logsCategories', {
                  defaultMessage: 'Visualize library',
                }),
              },
            ],
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navGroup',
        id: 'observability_project_nav_footer',
        children: [
          {
            title: i18n.translate('xpack.observability.obltNav.addData', {
              defaultMessage: 'Add data',
            }),
            link: 'observabilityOnboarding',
            iconV2: 'plusInCircle',
          },
          {
            id: 'devTools',
            title: i18n.translate('xpack.observability.obltNav.devTools', {
              defaultMessage: 'Developer tools',
            }),
            link: 'dev_tools',
            iconV2: 'code',
            icon: 'editorCodeBlock',
          },
          {
            id: DATA_MANAGEMENT_NAV_ID,
            title: i18n.translate('xpack.observability.obltNav.dataManagement', {
              defaultMessage: 'Data management',
              description:
                'The heading of a section in a navigation tree dedicated to data collection',
            }),
            renderAs: 'panelOpener',
            spaceBefore: null,
            iconV2: 'database',
            children: [
              {
                id: 'ingest_and_integrations',
                title: i18n.translate('xpack.observability.obltNav.ingestAndIntegrations', {
                  defaultMessage: 'Ingest and integrations',
                  description:
                    'The heading of a section in a navigation tree dedicated to data collection',
                }),
                renderAs: 'panelOpener',
                spaceBefore: null,
                children: [
                  {
                    link: 'integrations',
                  },
                  {
                    link: 'fleet',
                  },
                  {
                    link: 'management:ingest_pipelines',
                  },
                  {
                    link: 'management:pipelines',
                  },
                  {
                    link: 'management:content_connectors',
                  },
                ],
              },
              {
                id: 'indicesDataStreamsAndRollups',
                title: i18n.translate('xpack.observability.obltNav.indicesDataStreamsAndRollups', {
                  defaultMessage: 'Indices, data streams and roll ups',
                  description:
                    'Heading in a nav tree dedicated to UIs for leveraging various Elasticsearch features for data management',
                }),
                renderAs: 'panelOpener',
                children: [
                  {
                    link: 'management:index_management',
                  },
                  {
                    link: 'management:index_lifecycle_management',
                  },
                  {
                    link: 'management:snapshot_restore',
                  },
                  {
                    link: 'management:transform',
                  },
                  {
                    link: 'management:rollup_jobs',
                  },
                  {
                    link: 'management:data_quality',
                  },
                ],
              },
            ],
          },
          {
            id: STACK_MANAGEMENT_NAV_ID,
            title: i18n.translate('xpack.observability.obltNav.management', {
              defaultMessage: 'Stack Management',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'panelOpener',
            spaceBefore: null,
            children: [
              {
                id: 'stack_monitoring_title',
                title: '',
                renderAs: 'panelOpener',
                children: [{ link: 'monitoring' }],
              },
              {
                id: 'alerts_and_insights',
                title: i18n.translate('xpack.observability.obltNav.alertsAndInsights', {
                  defaultMessage: 'Alerts and Insights',
                }),
                renderAs: 'panelOpener',
                spaceBefore: null,
                children: [
                  {
                    link: 'observability-overview:rules',
                  },
                  {
                    link: 'management:triggersActionsConnectors',
                  },
                  {
                    link: 'management:reporting',
                  },
                  {
                    link: 'management:watcher',
                  },
                  {
                    link: 'management:maintenanceWindows',
                  },
                ],
              },
              {
                id: 'management_ml',
                title: i18n.translate('xpack.observability.obltNav.machineLearning', {
                  defaultMessage: 'Machine Learning',
                }),
                children: [
                  { link: 'management:overview' },
                  { link: 'management:anomaly_detection' },
                  { link: 'management:analytics' },
                  { link: 'management:trained_models' },
                  { link: 'management:supplied_configurations' },
                ],
              },
              {
                id: 'management_ai',
                title: i18n.translate('xpack.observability.obltNav.ai', {
                  defaultMessage: 'AI',
                }),
                children: [
                  { link: 'management:genAiSettings' },
                  { link: 'management:aiAssistantManagementSelection' },
                ],
              },
              {
                id: 'security',
                title: i18n.translate('xpack.observability.obltNav.security', {
                  defaultMessage: 'Security',
                }),
                renderAs: 'panelOpener',
                children: [
                  {
                    link: 'management:users',
                  },
                  {
                    link: 'management:roles',
                  },
                  {
                    link: 'management:api_keys',
                  },
                  {
                    link: 'management:role_mappings',
                  },
                ],
              },
              {
                id: 'data',
                title: i18n.translate('xpack.observability.obltNav.data', {
                  defaultMessage: 'Data',
                }),
                renderAs: 'panelOpener',
                children: [
                  {
                    link: 'management:cross_cluster_replication',
                  },
                  {
                    link: 'management:remote_clusters',
                  },
                ],
              },
              {
                id: 'kibana',
                title: i18n.translate('xpack.observability.obltNav.kibana', {
                  defaultMessage: 'Kibana',
                }),
                renderAs: 'panelOpener',
                children: [
                  {
                    link: 'management:filesManagement',
                  },
                  {
                    link: 'management:objects',
                  },
                  {
                    link: 'management:tags',
                  },
                  {
                    link: 'management:spaces',
                  },
                  {
                    link: 'management:settings',
                  },
                  {
                    link: 'management:dataViews',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return navTree;
}

export const createDefinition = (
  pluginsStart: ObservabilityPublicPluginsStart
): AddSolutionNavigationArg => ({
  id: 'oblt',
  title,
  icon: 'logoObservability',
  homePage: 'observabilityOnboarding',
  navigationTree$: (
    pluginsStart.streams?.navigationStatus$ || of({ status: 'disabled' as const })
  ).pipe(map(({ status }) => createNavTree({ streamsAvailable: status === 'enabled' }))),
  dataTestSubj: 'observabilitySideNav',
});
