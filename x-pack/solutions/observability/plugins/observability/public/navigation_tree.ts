/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';
import { map, of } from 'rxjs';
import type { ObservabilityPublicPluginsStart } from './plugin';

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
            link: 'observability-overview:alerts',
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
          },
          {
            link: 'slo',
          },
          {
            link: 'observabilityAIAssistant',
            title: i18n.translate('xpack.observability.obltNav.aiMl.aiAssistant', {
              defaultMessage: 'AI Assistant',
            }),
          },
          {
            link: 'inventory',
            spaceBefore: 'm',
          },
          ...(streamsAvailable
            ? [
                {
                  link: 'streams' as const,
                },
              ]
            : []),
          {
            id: 'apm',
            title: i18n.translate('xpack.observability.obltNav.applications', {
              defaultMessage: 'Applications',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                children: [
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
            ],
          },
          {
            id: 'metrics',
            title: i18n.translate('xpack.observability.obltNav.infrastructure', {
              defaultMessage: 'Infrastructure',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                children: [
                  {
                    link: 'metrics:inventory',
                    title: i18n.translate('xpack.observability.infrastructure.inventory', {
                      defaultMessage: 'Infrastructure Inventory',
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
                    defaultMessage: 'Universal profiling',
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
            id: 'machine_learning-landing',
            renderAs: 'panelOpener',
            title: i18n.translate('xpack.observability.obltNav.machineLearning', {
              defaultMessage: 'Machine learning',
            }),
            children: [
              {
                children: [
                  {
                    link: 'ml:overview',
                  },
                  {
                    link: 'ml:notifications',
                  },
                  {
                    link: 'ml:memoryUsage',
                    title: i18n.translate(
                      'xpack.observability.obltNav.machineLearning.memoryUsage',
                      {
                        defaultMessage: 'Memory usage',
                      }
                    ),
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
                    link: 'ml:anomalyDetection',
                    title: i18n.translate('xpack.observability.obltNav.ml.anomaly_detection.jobs', {
                      defaultMessage: 'Jobs',
                    }),
                  },
                  {
                    link: 'ml:anomalyExplorer',
                  },
                  {
                    link: 'ml:singleMetricViewer',
                  },
                  {
                    link: 'ml:settings',
                  },
                  {
                    link: 'ml:suppliedConfigurations',
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
                    link: 'ml:dataFrameAnalytics',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.data_frame_analytics.jobs',
                      {
                        defaultMessage: 'Jobs',
                      }
                    ),
                  },
                  {
                    link: 'ml:resultExplorer',
                  },
                  {
                    link: 'ml:analyticsMap',
                  },
                ],
              },
              {
                id: 'category-model_management',
                title: i18n.translate('xpack.observability.obltNav.ml.model_management', {
                  defaultMessage: 'Model management',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:nodesOverview',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.model_management.trainedModels',
                      {
                        defaultMessage: 'Trained models',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'category-data_visualizer',
                title: i18n.translate('xpack.observability.obltNav.ml.data_visualizer', {
                  defaultMessage: 'Data visualizer',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:fileUpload',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.data_visualizer.file_data_visualizer',
                      {
                        defaultMessage: 'File data visualizer',
                      }
                    ),
                  },
                  {
                    link: 'ml:indexDataVisualizer',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.data_visualizer.data_view_data_visualizer',
                      {
                        defaultMessage: 'Data view data visualizer',
                      }
                    ),
                  },
                  {
                    link: 'ml:esqlDataVisualizer',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.data_visualizer.esql_data_visualizer',
                      {
                        defaultMessage: 'ES|QL data visualizer',
                      }
                    ),
                  },
                  {
                    link: 'ml:dataDrift',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.data_visualizer.data_drift',
                      {
                        defaultMessage: 'Data drift',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'category-aiops_labs',
                title: i18n.translate('xpack.observability.obltNav.ml.aiops_labs', {
                  defaultMessage: 'Aiops labs',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:logRateAnalysis',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.aiops_labs.log_rate_analysis',
                      {
                        defaultMessage: 'Log rate analysis',
                      }
                    ),
                  },
                  {
                    link: 'ml:logPatternAnalysis',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.aiops_labs.log_pattern_analysis',
                      {
                        defaultMessage: 'Log pattern analysis',
                      }
                    ),
                  },
                  {
                    link: 'ml:changePointDetections',
                    title: i18n.translate(
                      'xpack.observability.obltNav.ml.aiops_labs.change_point_detection',
                      {
                        defaultMessage: 'Change point detection',
                      }
                    ),
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
            renderAs: 'panelOpener',
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
              { link: 'canvas' },
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
      { type: 'recentlyAccessed' },
      {
        type: 'navItem',
        title: i18n.translate('xpack.observability.obltNav.addData', {
          defaultMessage: 'Add data',
        }),
        link: 'observabilityOnboarding',
        icon: 'launch',
      },
      {
        type: 'navItem',
        id: 'devTools',
        title: i18n.translate('xpack.observability.obltNav.devTools', {
          defaultMessage: 'Developer tools',
        }),
        link: 'dev_tools',
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'project_settings_project_nav',
        title: i18n.translate('xpack.observability.obltNav.management', {
          defaultMessage: 'Management',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: 'stack_management', // This id can't be changed as we use it to open the panel programmatically
            title: i18n.translate('xpack.observability.obltNav.stackManagement', {
              defaultMessage: 'Stack Management',
            }),
            renderAs: 'panelOpener',
            spaceBefore: null,
            children: [
              {
                title: 'Ingest',
                children: [
                  { link: 'management:ingest_pipelines' },
                  { link: 'management:pipelines' },
                ],
              },
              {
                title: 'Data',
                children: [
                  { link: 'management:index_management' },
                  { link: 'management:data_quality' },
                  { link: 'management:index_lifecycle_management' },
                  { link: 'management:snapshot_restore' },
                  { link: 'management:rollup_jobs' },
                  { link: 'management:transform' },
                  { link: 'management:cross_cluster_replication' },
                  { link: 'management:remote_clusters' },
                  { link: 'management:migrate_data' },
                ],
              },
              {
                title: 'Alerts and Insights',
                children: [
                  { link: 'management:triggersActions' },
                  { link: 'management:cases' },
                  { link: 'management:triggersActionsConnectors' },
                  { link: 'management:reporting' },
                  { link: 'management:jobsListLink' },
                  { link: 'management:watcher' },
                  { link: 'management:maintenanceWindows' },
                ],
              },
              {
                title: 'Security',
                children: [
                  { link: 'management:users' },
                  { link: 'management:roles' },
                  { link: 'management:api_keys' },
                  { link: 'management:role_mappings' },
                ],
              },
              {
                title: 'Kibana',
                children: [
                  { link: 'management:dataViews' },
                  { link: 'management:filesManagement' },
                  { link: 'management:objects' },
                  { link: 'management:tags' },
                  { link: 'management:search_sessions' },
                  { link: 'management:aiAssistantManagementSelection' },
                  { link: 'management:spaces' },
                  { link: 'management:settings' },
                ],
              },
              {
                title: 'Stack',
                children: [
                  { link: 'management:license_management' },
                  { link: 'management:upgrade_assistant' },
                ],
              },
            ],
          },
          {
            id: 'monitoring',
            link: 'monitoring',
          },
          {
            link: 'integrations',
          },
          {
            link: 'fleet',
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
  navigationTree$: (pluginsStart.streams?.status$ || of({ status: 'disabled' as const })).pipe(
    map(({ status }) => createNavTree({ streamsAvailable: status === 'enabled' }))
  ),
  dataTestSubj: 'observabilitySideNav',
});
