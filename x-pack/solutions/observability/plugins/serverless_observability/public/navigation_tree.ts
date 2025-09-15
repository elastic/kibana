/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

export const createNavigationTree = ({
  streamsAvailable,
  overviewAvailable = true,
  isCasesAvailable = true,
}: {
  streamsAvailable?: boolean;
  overviewAvailable?: boolean;
  isCasesAvailable?: boolean;
}): NavigationTreeDefinition => {
  return {
    body: [
      {
        type: 'navGroup',
        id: 'observability_project_nav',
        title: 'Observability',
        icon: 'logoObservability',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          ...(overviewAvailable
            ? [
                {
                  title: i18n.translate('xpack.serverlessObservability.nav.overview', {
                    defaultMessage: 'Overview',
                  }),
                  link: 'observability-overview' as const,
                },
              ]
            : []),
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
            link: 'workflows',
            withBadge: true,
            badgeTypeV2: 'techPreview' as const,
            badgeOptions: {
              icon: 'beaker',
              tooltip: i18n.translate('xpack.serverlessObservability.nav.workflowsBadgeTooltip', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              }),
            },
          },
          {
            link: 'observability-overview:alerts',
            iconV2: 'warning',
          },
          ...(isCasesAvailable
            ? [
                {
                  link: 'observability-overview:cases' as const,
                  renderAs: 'item' as const,
                  iconV2: 'casesApp',
                  children: [
                    {
                      link: 'observability-overview:cases_configure' as const,
                    },
                    {
                      link: 'observability-overview:cases_create' as const,
                    },
                  ],
                },
              ]
            : []),
          {
            title: i18n.translate('xpack.serverlessObservability.nav.slo', {
              defaultMessage: 'SLOs',
            }),
            link: 'slo',
            iconV2: 'visGauge',
          },
          ...(streamsAvailable
            ? [
                {
                  link: 'streams' as const,
                  withBadge: true,
                  badgeOptions: {
                    icon: 'beaker',
                    tooltip: i18n.translate(
                      'xpack.serverlessObservability.nav.streamsBadgeTooltip',
                      {
                        defaultMessage:
                          'This functionality is experimental and not supported. It may change or be removed at any time.',
                      }
                    ),
                  },
                },
              ]
            : []),
          {
            id: 'applications',
            title: i18n.translate('xpack.serverlessObservability.nav.applications', {
              defaultMessage: 'Applications',
            }),
            renderAs: 'panelOpener',
            iconV2: 'spaces',
            spaceBefore: null,
            children: [
              {
                id: 'apm',
                children: [
                  {
                    link: 'apm:services',
                    title: i18n.translate('xpack.serverlessObservability.nav.apm.services', {
                      defaultMessage: 'Service inventory',
                    }),
                  },
                  {
                    link: 'apm:service-map',
                    title: i18n.translate('xpack.serverlessObservability.nav.apm.serviceMap', {
                      defaultMessage: 'Service map',
                    }),
                    sideNavStatus: 'hidden',
                  },
                  { link: 'apm:traces' },
                  { link: 'apm:dependencies' },
                  { link: 'apm:settings', sideNavStatus: 'hidden' },
                ],
              },
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
          {
            id: 'metrics',
            link: 'metrics:inventory',
            title: i18n.translate('xpack.serverlessObservability.nav.infrastructure', {
              defaultMessage: 'Infrastructure',
            }),
            renderAs: 'panelOpener',
            iconV2: 'storage',
            spaceBefore: null,
            children: [
              {
                children: [
                  {
                    link: 'metrics:inventory',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.infrastructureInventory',
                      {
                        defaultMessage: 'Infrastructure inventory',
                      }
                    ),
                  },
                  { link: 'metrics:hosts' },
                  { link: 'metrics:settings', sideNavStatus: 'hidden' },
                ],
              },
            ],
          },
          {
            link: 'observabilityAIAssistant',
            title: i18n.translate('xpack.serverlessObservability.nav.aiAssistant', {
              defaultMessage: 'AI Assistant',
            }),
          },
          {
            id: 'machine_learning-landing',
            renderAs: 'panelOpener',
            title: i18n.translate('xpack.serverlessObservability.nav.machineLearning', {
              defaultMessage: 'Machine Learning',
            }),
            iconV2: 'info',
            children: [
              {
                id: 'category-ml_overview',
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
                title: i18n.translate('xpack.serverlessObservability.nav.ml.anomaly_detection', {
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
                title: i18n.translate('xpack.serverlessObservability.nav.ml.data_frame_analytics', {
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
                title: i18n.translate('xpack.serverlessObservability.nav.ml.aiops_labs', {
                  defaultMessage: 'AIOps labs',
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
          {
            id: 'otherTools',
            title: i18n.translate('xpack.serverlessObservability.nav.otherTools', {
              defaultMessage: 'Other tools',
            }),
            spaceBefore: null,
            renderAs: 'panelOpener',
            children: [
              {
                link: 'logs:anomalies',
                title: i18n.translate(
                  'xpack.serverlessObservability.nav.otherTools.logsAnomalies',
                  {
                    defaultMessage: 'Logs anomalies',
                  }
                ),
              },
              {
                link: 'logs:log-categories',
                title: i18n.translate(
                  'xpack.serverlessObservability.nav.otherTools.logsCategories',
                  {
                    defaultMessage: 'Logs categories',
                  }
                ),
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
            title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
              defaultMessage: 'Add data',
            }),
            link: 'observabilityOnboarding',
            icon: 'launch',
          },
          {
            id: 'devTools',
            title: i18n.translate('xpack.serverlessObservability.nav.devTools', {
              defaultMessage: 'Developer tools',
            }),
            link: 'dev_tools',
            icon: 'editorCodeBlock',
          },
          {
            id: 'ingest_and_manage_data',
            title: i18n.translate('xpack.serverlessObservability.nav.ingestAndManageData', {
              defaultMessage: 'Ingest and manage data',
            }),
            renderAs: 'panelOpener',
            spaceBefore: null,
            icon: 'info',
            children: [
              {
                title: 'Ingest and integrations',
                children: [
                  { link: 'integrations' },
                  { link: 'fleet' },
                  { link: 'management:ingest_pipelines' },
                  { link: 'management:pipelines' },
                  { link: 'management:content_connectors' },
                ],
              },
              {
                title: 'Indices, data streams, and roll ups',
                children: [
                  { link: 'management:index_management' },
                  { link: 'management:index_lifecycle_management' },
                  { link: 'management:snapshot_restore' },
                  { link: 'management:transform' },
                  { link: 'management:rollup_jobs' },
                  { link: 'management:data_quality' },
                ],
              },
            ],
          },
          {
            id: 'project_settings_project_nav',
            title: i18n.translate('xpack.serverlessObservability.nav.adminAndSettings', {
              defaultMessage: 'Admin and Settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'panelOpener',
            spaceBefore: null,
            children: [
              {
                id: 'cloud_link_org_settings',
                title: '',
                children: [
                  {
                    cloudLink: 'billingAndSub',
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.projectSettings.organizationSettings',
                      { defaultMessage: 'Billing and subscription [external]' }
                    ),
                  },
                  {
                    cloudLink: 'performance',
                  },
                ],
              },
              {
                id: 'access',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.access', {
                  defaultMessage: 'Access',
                }),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:api_keys' }, { link: 'management:roles' }],
              },
              {
                id: 'alerts_and_insights',
                title: i18n.translate(
                  'xpack.serverlessObservability.nav.projectSettings.alertsAndInsights',
                  {
                    defaultMessage: 'Alerts and insights',
                  }
                ),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'observability-overview:alerts' },
                  { link: 'observability-overview:rules' },
                  { link: 'management:triggersActionsConnectors' },
                ],
              },
              {
                id: 'machine_learning',
                title: i18n.translate(
                  'xpack.serverlessObservability.nav.projectSettings.machineLearning',
                  {
                    defaultMessage: 'Machine Learning',
                  }
                ),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:trained_models' }],
              },
              {
                id: 'data',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.data', {
                  defaultMessage: 'Data',
                }),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:data_usage' }],
              },
              {
                id: 'content',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.content', {
                  defaultMessage: 'Content',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'management:dataViews' },
                  { link: 'management:spaces' },
                  { link: 'management:objects' },
                  { link: 'management:filesManagement' },
                  { link: 'management:reporting' },
                  { link: 'management:tags' },
                ],
              },
              {
                id: 'other',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.other', {
                  defaultMessage: 'Other',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'management:settings' },
                  { link: 'management:observabilityAiAssistantManagement' },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};
