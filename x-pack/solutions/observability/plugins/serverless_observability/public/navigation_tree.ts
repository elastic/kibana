/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { NavigationTreeDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';

const LazyIconBriefcase = lazy(() =>
  import('@kbn/observability-nav-icons').then(({ iconBriefcase }) => ({ default: iconBriefcase }))
);
const LazyIconMl = lazy(() =>
  import('@kbn/observability-nav-icons').then(({ iconProductMl }) => ({ default: iconProductMl }))
);
const LazyIconProductStreamsWired = lazy(() =>
  import('@kbn/observability-nav-icons').then(({ iconProductStreamsWired }) => ({
    default: iconProductStreamsWired,
  }))
);
const LazyIconProductCloudInfra = lazy(() =>
  import('@kbn/observability-nav-icons').then(({ iconProductCloudInfra }) => ({
    default: iconProductCloudInfra,
  }))
);

export function filterForFeatureAvailability(
  node: NodeDefinition,
  featureFlag: boolean = false
): NodeDefinition[] {
  if (!featureFlag) {
    return [];
  }
  return [node];
}

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
        title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.observability', {
          defaultMessage: 'Observability',
        }),
        icon: 'logoObservability',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            title: i18n.translate('xpack.serverlessObservability.nav.overview.title', {
              defaultMessage: 'Observability',
            }),
            link: overviewAvailable
              ? ('observability-overview' as const)
              : ('observabilityOnboarding' as const),
            renderAs: 'home',
            icon: 'logoObservability',
            sideNavVersion: 'v2',
          },
          ...filterForFeatureAvailability(
            {
              title: i18n.translate('xpack.serverlessObservability.nav.overview', {
                defaultMessage: 'Overview',
              }),
              link: 'observability-overview' as const,
              sideNavVersion: 'v1',
            },
            overviewAvailable
          ),
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
          ...filterForFeatureAvailability(
            {
              link: 'observability-overview:cases' as const,
              renderAs: 'item' as const,
              iconV2: LazyIconBriefcase,
              children: [
                {
                  link: 'observability-overview:cases_configure' as const,
                },
                {
                  link: 'observability-overview:cases_create' as const,
                },
              ],
            },
            isCasesAvailable
          ),
          {
            title: i18n.translate('xpack.serverlessObservability.nav.slo', {
              defaultMessage: 'SLOs',
            }),
            link: 'slo',
            iconV2: 'visGauge',
          },
          {
            link: 'observabilityAIAssistant',
            title: i18n.translate('xpack.serverlessObservability.nav.aiAssistant', {
              defaultMessage: 'AI Assistant',
            }),
            sideNavVersion: 'v1',
          },
          ...filterForFeatureAvailability(
            {
              link: 'streams' as const,
              iconV2: LazyIconProductStreamsWired,
            },
            streamsAvailable
          ),
          {
            id: 'applications',
            title: i18n.translate('xpack.serverlessObservability.nav.applications', {
              defaultMessage: 'Applications',
            }),
            renderAs: 'panelOpener',
            iconV2: 'spaces',
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
            iconV2: LazyIconProductCloudInfra,
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
            iconV2: 'sparkles',
            sideNavVersion: 'v2',
          },
          ...filterForFeatureAvailability(
            {
              id: 'machine_learning-landing',
              renderAs: 'panelOpener',
              title: i18n.translate('xpack.serverlessObservability.nav.machineLearning', {
                defaultMessage: 'Machine Learning',
              }),
              iconV2: LazyIconMl,
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
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.ml.data_frame_analytics',
                    {
                      defaultMessage: 'Data frame analytics',
                    }
                  ),
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
            overviewAvailable
          ),
          {
            id: 'otherTools',
            title: i18n.translate('xpack.serverlessObservability.nav.otherTools', {
              defaultMessage: 'Other tools',
            }),
            renderAs: 'panelOpener',
            iconV2: 'wrench',
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
            iconV2: 'plusInCircle',
          },
          {
            id: 'devTools',
            title: i18n.translate('xpack.serverlessObservability.nav.devTools', {
              defaultMessage: 'Developer tools',
            }),
            link: 'dev_tools',
            icon: 'code',
          },
          {
            id: DATA_MANAGEMENT_NAV_ID,
            title: i18n.translate('xpack.serverlessObservability.nav.dataManagement', {
              defaultMessage: 'Data management',
            }),
            renderAs: 'panelOpener',
            spaceBefore: null,
            iconV2: 'database',
            sideNavVersion: 'v2',
            breadcrumbStatus: 'hidden',
            children: [
              {
                title: i18n.translate('xpack.serverlessObservability.nav.ingestAndIntegrations', {
                  defaultMessage: 'Ingest and integrations',
                  description:
                    'The title of the ingest and integrations navigation item in the serverless observability nav tree.',
                }),
                breadcrumbStatus: 'hidden',
                children: [
                  { link: 'integrations' },
                  { link: 'fleet' },
                  { link: 'management:ingest_pipelines' },
                  { link: 'management:pipelines' },
                  { link: 'management:content_connectors' },
                ],
              },
              {
                title: i18n.translate(
                  'xpack.serverlessObservability.nav.indicesDataStreamsAndRollups',
                  {
                    defaultMessage: 'Indices and data streams',
                  }
                ),
                children: [
                  { link: 'management:index_management' },
                  { link: 'management:index_lifecycle_management' },
                  { link: 'management:snapshot_restore' },
                  { link: 'management:transform' },
                  { link: 'management:rollup_jobs' },
                  { link: 'management:data_quality' },
                  { link: 'management:data_usage' },
                ],
              },
            ],
          },
          {
            id: 'admin_and_settings',
            title: i18n.translate('xpack.serverlessObservability.nav.adminAndSettings', {
              defaultMessage: 'Admin and Settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'panelOpener',
            spaceBefore: null,
            sideNavVersion: 'v2',
            children: [
              {
                id: 'access',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.access', {
                  defaultMessage: 'Access',
                }),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:api_keys' }, { link: 'management:roles' }],
              },
              {
                id: 'cloud_link_org_settings',
                title: i18n.translate(
                  'xpack.serverlessObservability.nav.projectSettings.organization',
                  {
                    defaultMessage: 'Organization',
                  }
                ),
                children: [
                  {
                    cloudLink: 'billingAndSub',
                  },
                  {
                    cloudLink: 'userAndRoles',
                  },
                ],
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
                  { link: 'management:triggersActionsAlerts' },
                  { link: 'management:triggersActions' },
                  { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                  { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
                ],
              },
              ...filterForFeatureAvailability(
                {
                  id: 'machine_learning',
                  title: i18n.translate(
                    'xpack.serverlessObservability.nav.projectSettings.machineLearning',
                    {
                      defaultMessage: 'Machine Learning',
                    }
                  ),
                  breadcrumbStatus: 'hidden',
                  children: [
                    { link: 'management:overview' },
                    { link: 'management:anomaly_detection' },
                    { link: 'management:analytics' },
                    { link: 'management:trained_models' },
                    { link: 'management:supplied_configurations' },
                  ],
                },
                overviewAvailable
              ),
              ...filterForFeatureAvailability(
                {
                  title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.ai', {
                    defaultMessage: 'AI',
                  }),
                  children: [
                    {
                      link: 'management:genAiSettings',
                      breadcrumbStatus: 'hidden',
                    },
                    {
                      link: 'management:observabilityAiAssistantManagement',
                      breadcrumbStatus: 'hidden',
                    },
                  ],
                },
                overviewAvailable
              ),
              {
                id: 'content',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.content', {
                  defaultMessage: 'Content',
                }),
                breadcrumbStatus: 'hidden',
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
                id: 'other',
                title: i18n.translate('xpack.serverlessObservability.nav.projectSettings.other', {
                  defaultMessage: 'Other',
                }),
                breadcrumbStatus: 'hidden',
                children: [{ link: 'management:settings' }],
              },
              {
                // We include this link here to ensure that sidenav panel opens when user lands to legacy management landing page
                // https://github.com/elastic/kibana/issues/240275
                link: 'management',
                sideNavStatus: 'hidden',
              },
            ],
          },
          {
            id: 'project_settings_project_nav',
            title: i18n.translate('xpack.serverlessObservability.nav.projectSettings', {
              defaultMessage: 'Project settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'accordion',
            spaceBefore: null,
            sideNavVersion: 'v1',
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
                      { link: 'management:content_connectors', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessObservability.nav.mngt.access', {
                      defaultMessage: 'Access',
                    }),
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
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.mngt.alertsAndInsights',
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
                  ...filterForFeatureAvailability(
                    {
                      title: i18n.translate(
                        'xpack.serverlessObservability.nav.mngt.machineLearning',
                        {
                          defaultMessage: 'Machine Learning',
                        }
                      ),
                      children: [
                        { link: 'management:overview' },
                        { link: 'management:anomaly_detection' },
                        { link: 'management:analytics' },
                        { link: 'management:trained_models' },
                        { link: 'management:supplied_configurations' },
                      ],
                    },
                    overviewAvailable
                  ),
                  ...filterForFeatureAvailability(
                    {
                      title: i18n.translate('xpack.serverlessObservability.nav.mngt.ai', {
                        defaultMessage: 'AI',
                      }),
                      children: [
                        {
                          link: 'management:genAiSettings',
                          breadcrumbStatus: 'hidden',
                        },
                        {
                          link: 'management:observabilityAiAssistantManagement',
                          breadcrumbStatus: 'hidden',
                        },
                      ],
                    },
                    overviewAvailable
                  ),
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
                    children: [{ link: 'management:settings', breadcrumbStatus: 'hidden' }],
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
