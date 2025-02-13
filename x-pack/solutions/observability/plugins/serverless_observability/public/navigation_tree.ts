/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

export const createNavigationTree = ({
  streamsAvailable,
}: {
  streamsAvailable?: boolean;
}): NavigationTreeDefinition => {
  return {
    body: [
      { type: 'recentlyAccessed' },
      {
        type: 'navGroup',
        id: 'observability_project_nav',
        title: 'Observability',
        icon: 'logoObservability',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            title: i18n.translate('xpack.serverlessObservability.nav.discover', {
              defaultMessage: 'Discover',
            }),
            link: 'discover',
          },
          {
            title: i18n.translate('xpack.serverlessObservability.nav.dashboards', {
              defaultMessage: 'Dashboards',
            }),
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
            title: i18n.translate('xpack.serverlessObservability.nav.slo', {
              defaultMessage: 'SLOs',
            }),
            link: 'slo',
          },
          {
            link: 'observabilityAIAssistant',
            title: i18n.translate('xpack.serverlessObservability.nav.aiAssistant', {
              defaultMessage: 'AI Assistant',
            }),
          },
          { link: 'inventory', spaceBefore: 'm' },
          ...(streamsAvailable
            ? [
                {
                  link: 'streams' as const,
                },
              ]
            : []),
          {
            id: 'apm',
            title: i18n.translate('xpack.serverlessObservability.nav.applications', {
              defaultMessage: 'Applications',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                children: [
                  {
                    link: 'apm:services',
                    title: i18n.translate('xpack.serverlessObservability.nav.apm.services', {
                      defaultMessage: 'Service Inventory',
                    }),
                  },
                  { link: 'apm:traces' },
                  { link: 'apm:dependencies' },
                  { link: 'apm:settings' },
                  {
                    id: 'synthetics',
                    title: i18n.translate('xpack.serverlessObservability.nav.synthetics', {
                      defaultMessage: 'Synthetics',
                    }),
                    children: [
                      {
                        title: i18n.translate(
                          'xpack.serverlessObservability.nav.synthetics.overviewItem',
                          {
                            defaultMessage: 'Overview',
                          }
                        ),
                        id: 'synthetics-overview',
                        link: 'synthetics:overview',
                        breadcrumbStatus: 'hidden',
                      },
                      {
                        link: 'synthetics:certificates',
                        title: i18n.translate(
                          'xpack.serverlessObservability.nav.synthetics.certificatesItem',
                          {
                            defaultMessage: 'TLS certificates',
                          }
                        ),
                        id: 'synthetics-certificates',
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'metrics',
            title: i18n.translate('xpack.serverlessObservability.nav.infrastructure', {
              defaultMessage: 'Infrastructure',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                children: [
                  {
                    link: 'metrics:inventory',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.infrastructureInventory',
                      {
                        defaultMessage: 'Infrastructure Inventory',
                      }
                    ),
                  },
                  { link: 'metrics:hosts' },
                  { link: 'metrics:settings' },
                  { link: 'metrics:assetDetails' },
                ],
              },
            ],
          },
          {
            id: 'machine_learning-landing',
            renderAs: 'panelOpener',
            title: i18n.translate('xpack.serverlessObservability.nav.machineLearning', {
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
                      'xpack.serverlessObservability.nav.machineLearning.memoryUsage',
                      {
                        defaultMessage: 'Memory usage',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'category-anomaly_detection',
                title: i18n.translate('xpack.serverlessObservability.nav.ml.anomaly_detection', {
                  defaultMessage: 'Anomaly detection',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:anomalyDetection',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.anomaly_detection.jobs',
                      {
                        defaultMessage: 'Jobs',
                      }
                    ),
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
                title: i18n.translate('xpack.serverlessObservability.nav.ml.data_frame_analytics', {
                  defaultMessage: 'Data frame analytics',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:dataFrameAnalytics',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.data_frame_analytics.jobs',
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
                title: i18n.translate('xpack.serverlessObservability.nav.ml.model_management', {
                  defaultMessage: 'Model management',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:nodesOverview',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.model_management.trainedModels',
                      {
                        defaultMessage: 'Trained models',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'category-data_visualizer',
                title: i18n.translate('xpack.serverlessObservability.nav.ml.data_visualizer', {
                  defaultMessage: 'Data visualizer',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:fileUpload',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.data_visualizer.file_data_visualizer',
                      {
                        defaultMessage: 'File data visualizer',
                      }
                    ),
                  },
                  {
                    link: 'ml:indexDataVisualizer',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.data_visualizer.data_view_data_visualizer',
                      {
                        defaultMessage: 'Data view data visualizer',
                      }
                    ),
                  },
                  {
                    link: 'ml:dataDrift',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.data_visualizer.data_drift',
                      {
                        defaultMessage: 'Data drift',
                      }
                    ),
                  },
                ],
              },
              {
                id: 'category-aiops_labs',
                title: i18n.translate('xpack.serverlessObservability.nav.ml.aiops_labs', {
                  defaultMessage: 'Aiops labs',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:logRateAnalysis',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.aiops_labs.log_rate_analysis',
                      {
                        defaultMessage: 'Log rate analysis',
                      }
                    ),
                  },
                  {
                    link: 'ml:logPatternAnalysis',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.aiops_labs.log_pattern_analysis',
                      {
                        defaultMessage: 'Log pattern analysis',
                      }
                    ),
                  },
                  {
                    link: 'ml:changePointDetections',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.ml.aiops_labs.change_point_detection',
                      {
                        defaultMessage: 'Change point detection',
                      }
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navItem',
        title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
          defaultMessage: 'Add data',
        }),
        link: 'observabilityOnboarding',
        icon: 'launch',
      },
      {
        type: 'navItem',
        id: 'devTools',
        title: i18n.translate('xpack.serverlessObservability.nav.devTools', {
          defaultMessage: 'Developer tools',
        }),
        link: 'dev_tools',
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'project_settings_project_nav',
        title: i18n.translate('xpack.serverlessObservability.nav.projectSettings', {
          defaultMessage: 'Project settings',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: 'management',
            title: i18n.translate('xpack.serverlessObservability.nav.mngt', {
              defaultMessage: 'Management',
            }),
            spaceBefore: null,
            renderAs: 'panelOpener',
            children: [
              {
                title: i18n.translate('xpack.serverlessObservability.nav.mngt.data', {
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
                title: i18n.translate('xpack.serverlessObservability.nav.mngt.access', {
                  defaultMessage: 'Access',
                }),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:api_keys', breadcrumbStatus: 'hidden' }],
              },
              {
                title: i18n.translate('xpack.serverlessObservability.nav.mngt.alertsAndInsights', {
                  defaultMessage: 'Alerts and insights',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                  { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
                ],
              },
              {
                title: i18n.translate('xpack.serverlessObservability.nav.mngt.content', {
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
                title: i18n.translate('xpack.serverlessObservability.nav.mngt.other', {
                  defaultMessage: 'Other',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'management:settings', breadcrumbStatus: 'hidden' },
                  {
                    link: 'management:observabilityAiAssistantManagement',
                    breadcrumbStatus: 'hidden',
                  },
                ],
              },
            ],
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
};
