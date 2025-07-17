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
                  title: i18n.translate('app_not_found_in_i18nrc.nav.overview', {
                    defaultMessage: 'Overview',
                  }),
                  link: 'observability-overview' as const,
                },
              ]
            : []),
          {
            title: i18n.translate('app_not_found_in_i18nrc.nav.discover', {
              defaultMessage: 'Discover',
            }),
            link: 'discover',
          },
          {
            title: i18n.translate('app_not_found_in_i18nrc.nav.dashboards', {
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
          ...(isCasesAvailable
            ? [
                {
                  link: 'observability-overview:cases' as const,
                  renderAs: 'item' as const,
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
            title: i18n.translate('app_not_found_in_i18nrc.nav.slo', {
              defaultMessage: 'SLOs',
            }),
            link: 'slo',
          },
          {
            link: 'observabilityAIAssistant',
            title: i18n.translate('app_not_found_in_i18nrc.nav.aiAssistant', {
              defaultMessage: 'AI Assistant',
            }),
          },
          ...(streamsAvailable
            ? [
                {
                  link: 'streams' as const,
                  withBadge: true,
                  badgeOptions: {
                    icon: 'beaker',
                    tooltip: i18n.translate('app_not_found_in_i18nrc.nav.streamsBadgeTooltip', {
                      defaultMessage:
                        'This functionality is experimental and not supported. It may change or be removed at any time.',
                    }),
                  },
                },
              ]
            : []),
          {
            id: 'apm',
            link: 'apm:services',
            title: i18n.translate('app_not_found_in_i18nrc.nav.applications', {
              defaultMessage: 'Applications',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                children: [
                  {
                    link: 'apm:services',
                    title: i18n.translate('app_not_found_in_i18nrc.nav.apm.services', {
                      defaultMessage: 'Service Inventory',
                    }),
                  },
                  { link: 'apm:traces' },
                  { link: 'apm:dependencies' },
                  { link: 'apm:settings', sideNavStatus: 'hidden' },
                ],
              },
              {
                id: 'synthetics',
                title: i18n.translate('app_not_found_in_i18nrc.nav.synthetics', {
                  defaultMessage: 'Synthetics',
                }),
                children: [
                  {
                    title: i18n.translate('app_not_found_in_i18nrc.nav.synthetics.overviewItem', {
                      defaultMessage: 'Overview',
                    }),
                    id: 'synthetics-overview',
                    link: 'synthetics:overview',
                    breadcrumbStatus: 'hidden',
                  },
                  {
                    link: 'synthetics:certificates',
                    title: i18n.translate(
                      'app_not_found_in_i18nrc.nav.synthetics.certificatesItem',
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
            title: i18n.translate('app_not_found_in_i18nrc.nav.infrastructure', {
              defaultMessage: 'Infrastructure',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                children: [
                  {
                    link: 'metrics:inventory',
                    title: i18n.translate('app_not_found_in_i18nrc.nav.infrastructureInventory', {
                      defaultMessage: 'Infrastructure Inventory',
                    }),
                  },
                  { link: 'metrics:hosts' },
                  { link: 'metrics:settings', sideNavStatus: 'hidden' },
                ],
              },
              {
                id: 'profiling',
                title: i18n.translate('app_not_found_in_i18nrc.nav.profiling', {
                  defaultMessage: 'Profiling',
                }),
                children: [
                  {
                    title: i18n.translate(
                      'app_not_found_in_i18nrc.navigation.stacktracesLinkLabel',
                      {
                        defaultMessage: 'Stacktraces',
                      }
                    ),
                    id: 'profiling-stacktraces',
                    link: 'profiling:stacktraces',
                    breadcrumbStatus: 'hidden',
                  },
                  {
                    link: 'profiling:flamegraphs',
                    title: i18n.translate(
                      'app_not_found_in_i18nrc.navigation.flameGraphsLinkLabel',
                      {
                        defaultMessage: 'Flamegraphs',
                      }
                    ),
                    id: 'profiling-flamegraphs',
                    breadcrumbStatus: 'hidden',
                  },
                  {
                    link: 'profiling:functions',
                    title: i18n.translate('app_not_found_in_i18nrc.navigation.functionsLinkLabel', {
                      defaultMessage: 'Functions',
                    }),
                    id: 'profiling-functions',
                    breadcrumbStatus: 'hidden',
                  },
                ],
              },
            ],
          },
          {
            id: 'machine_learning-landing',
            renderAs: 'panelOpener',
            title: i18n.translate('app_not_found_in_i18nrc.nav.machineLearning', {
              defaultMessage: 'Machine Learning',
            }),
            children: [
              {
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
                title: i18n.translate('app_not_found_in_i18nrc.nav.ml.anomaly_detection', {
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
                title: i18n.translate('app_not_found_in_i18nrc.nav.ml.data_frame_analytics', {
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
                title: i18n.translate('app_not_found_in_i18nrc.nav.ml.aiops_labs', {
                  defaultMessage: 'AIOps labs',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  {
                    link: 'ml:logRateAnalysis',
                    title: i18n.translate(
                      'app_not_found_in_i18nrc.nav.ml.aiops_labs.log_rate_analysis',
                      {
                        defaultMessage: 'Log rate analysis',
                      }
                    ),
                  },
                  {
                    link: 'ml:logPatternAnalysis',
                    title: i18n.translate(
                      'app_not_found_in_i18nrc.nav.ml.aiops_labs.log_pattern_analysis',
                      {
                        defaultMessage: 'Log pattern analysis',
                      }
                    ),
                  },
                  {
                    link: 'ml:changePointDetections',
                    title: i18n.translate(
                      'app_not_found_in_i18nrc.nav.ml.aiops_labs.change_point_detection',
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
            title: i18n.translate('app_not_found_in_i18nrc.nav.otherTools', {
              defaultMessage: 'Other tools',
            }),
            renderAs: 'panelOpener',
            children: [
              {
                link: 'logs:anomalies',
                title: i18n.translate('app_not_found_in_i18nrc.nav.otherTools.logsAnomalies', {
                  defaultMessage: 'Logs anomalies',
                }),
              },
              {
                link: 'logs:log-categories',
                title: i18n.translate('app_not_found_in_i18nrc.nav.otherTools.logsCategories', {
                  defaultMessage: 'Logs categories',
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
            title: i18n.translate('app_not_found_in_i18nrc.nav.getStarted', {
              defaultMessage: 'Add data',
            }),
            link: 'observabilityOnboarding',
            icon: 'launch',
          },
          {
            id: 'devTools',
            title: i18n.translate('app_not_found_in_i18nrc.nav.devTools', {
              defaultMessage: 'Developer tools',
            }),
            link: 'dev_tools',
            icon: 'editorCodeBlock',
          },
          {
            id: 'project_settings_project_nav',
            title: i18n.translate('app_not_found_in_i18nrc.nav.projectSettings', {
              defaultMessage: 'Project settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'accordion',
            spaceBefore: null,
            children: [
              {
                id: 'management',
                title: i18n.translate('app_not_found_in_i18nrc.nav.mngt', {
                  defaultMessage: 'Management',
                }),
                spaceBefore: null,
                renderAs: 'panelOpener',
                children: [
                  {
                    title: i18n.translate('app_not_found_in_i18nrc.nav.mngt.data', {
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
                      { link: 'management:content_connectors', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('app_not_found_in_i18nrc.nav.mngt.access', {
                      defaultMessage: 'Access',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:api_keys', breadcrumbStatus: 'hidden' },
                      { link: 'management:roles', breadcrumbStatus: 'hidden' },
                      {
                        cloudLink: 'userAndRoles',
                        title: i18n.translate(
                          'app_not_found_in_i18nrc.navLinks.projectSettings.mngt.usersAndRoles',
                          { defaultMessage: 'Manage organization members' }
                        ),
                      },
                    ],
                  },
                  {
                    title: i18n.translate('app_not_found_in_i18nrc.nav.mngt.alertsAndInsights', {
                      defaultMessage: 'Alerts and insights',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                      { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: 'Machine Learning',
                    children: [
                      { link: 'management:overview' },
                      { link: 'management:anomaly_detection' },
                      { link: 'management:analytics' },
                      { link: 'management:trained_models' },
                      { link: 'management:supplied_configurations' },
                    ],
                  },
                  {
                    title: i18n.translate('app_not_found_in_i18nrc.nav.mngt.content', {
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
                    title: i18n.translate('app_not_found_in_i18nrc.nav.mngt.other', {
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
