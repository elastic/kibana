/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DeploymentStats } from '../hooks/use_deployment_stats';
import { formatBytes, formatNumber } from '../utils/format';
import { STAT_TILE_LABELS } from '../constants';
import type { HomePageStatPanelProps } from './home_page_stat_panel';

interface StatCardDeps {
  application: ApplicationStart;
  stats: DeploymentStats;
  isLoading: boolean;
}

type HomePageStats = Omit<HomePageStatPanelProps, 'newIndex'>;

const showVectorCount = ({ application }: Pick<StatCardDeps, 'application'>): boolean =>
  application.capabilities.vectordbIndexStats?.canMonitorAllIndices === true;

export const getDataCard = ({ application, stats, isLoading }: StatCardDeps): HomePageStats => ({
  iconType: 'database',
  title: i18n.translate('xpack.serverlessVectordb.home.dataCard.title', {
    defaultMessage: 'Data',
  }),
  testSubj: 'homePageDataCard',
  showPrimary: true,
  metrics: [
    {
      key: 'totalIndices',
      label: STAT_TILE_LABELS.totalIndices,
      value: formatNumber(stats.indicesCount),
      isLoading,
    },
    {
      key: 'documents',
      label: STAT_TILE_LABELS.documents,
      value: formatNumber(stats.documentsCount),
      isLoading,
    },
    ...(showVectorCount({ application })
      ? [
          {
            key: 'vectors',
            label: STAT_TILE_LABELS.vectors,
            value: formatNumber(stats.vectorCount),
            isLoading,
          },
        ]
      : []),
    {
      key: 'totalSize',
      label: STAT_TILE_LABELS.totalSize,
      value: formatBytes(stats.storeSizeBytes),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'viewIndices',
      label: i18n.translate('xpack.serverlessVectordb.home.dataCard.dataManagement', {
        defaultMessage: 'Manage data',
      }),
      onClick: () =>
        application.navigateToApp('management', {
          path: '/data/index_management/indices',
        }),
      testSubj: 'homePageDataCardDataManagement',
      telemetryId: 'serverlessVectordb-home-dataCard-dataManagement',
    },
  ],
});

const getDashboardsCard = ({ application, stats, isLoading }: StatCardDeps): HomePageStats => ({
  iconType: 'productDashboard',
  title: i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.title', {
    defaultMessage: 'Dashboards',
  }),
  testSubj: 'homePageDashboardsCard',
  actionsMenuTelemetryId: 'serverlessVectordb-home-dashboardsCard-actionsMenu',
  metrics: [
    {
      key: 'dashboardsTotal',
      label: STAT_TILE_LABELS.dashboardsTotal,
      value: formatNumber(stats.dashboardsCount),
      isLoading,
    },
    {
      key: 'dashboardsStarred',
      label: STAT_TILE_LABELS.dashboardsStarred,
      value: formatNumber(stats.starredDashboardsCount),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'createDashboard',
      iconType: 'plusCircle',
      label: i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.createDashboard', {
        defaultMessage: 'Create a dashboard',
      }),
      onClick: () => application.navigateToApp('dashboards', { path: '#/create' }),
      testSubj: 'homePageDashboardsCardCreateDashboard',
      telemetryId: 'serverlessVectordb-home-dashboardsCard-createDashboard',
    },
    {
      key: 'manageDashboards',
      iconType: 'gear',
      label: i18n.translate('xpack.serverlessVectordb.home.dashboardsCard.manageDashboards', {
        defaultMessage: 'Manage dashboards',
      }),
      onClick: () => application.navigateToApp('dashboards', { path: '#/list' }),
      testSubj: 'homePageDashboardsCardManageDashboards',
      telemetryId: 'serverlessVectordb-home-dashboardsCard-manageDashboards',
    },
  ],
});

const getWorkflowsCard = ({ application, stats, isLoading }: StatCardDeps): HomePageStats => ({
  iconType: 'workflow',
  title: i18n.translate('xpack.serverlessVectordb.home.workflowsCard.title', {
    defaultMessage: 'Workflows',
  }),
  testSubj: 'homePageWorkflowsCard',
  actionsMenuTelemetryId: 'serverlessVectordb-home-workflowsCard-actionsMenu',
  metrics: [
    {
      key: 'workflowsTotal',
      label: STAT_TILE_LABELS.workflowsTotal,
      value: formatNumber(stats.workflowsCount),
      isLoading,
    },
    {
      key: 'workflowsRunning',
      label: STAT_TILE_LABELS.workflowsRunning,
      value: formatNumber(stats.workflowsRunningCount),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'createWorkflow',
      iconType: 'plusCircle',
      label: i18n.translate('xpack.serverlessVectordb.home.workflowsCard.createWorkflow', {
        defaultMessage: 'Create a workflow',
      }),
      onClick: () => application.navigateToApp('workflows', { path: '/create' }),
      testSubj: 'homePageWorkflowsCardCreateWorkflow',
      telemetryId: 'serverlessVectordb-home-workflowsCard-createWorkflow',
    },
    {
      key: 'manageWorkflows',
      iconType: 'gear',
      label: i18n.translate('xpack.serverlessVectordb.home.workflowsCard.manageWorkflows', {
        defaultMessage: 'Manage workflows',
      }),
      onClick: () => application.navigateToApp('workflows'),
      testSubj: 'homePageWorkflowsCardManageWorkflows',
      telemetryId: 'serverlessVectordb-home-workflowsCard-manageWorkflows',
    },
  ],
});

const getApiKeysCard = ({ application, stats, isLoading }: StatCardDeps): HomePageStats => ({
  iconType: 'key',
  title: i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.title', {
    defaultMessage: 'API Keys',
  }),
  testSubj: 'homePageApiKeysCard',
  actionsMenuTelemetryId: 'serverlessVectordb-home-apiKeysCard-actionsMenu',
  metrics: [
    {
      key: 'apiKeysTotal',
      label: STAT_TILE_LABELS.apiKeysTotal,
      value: formatNumber(stats.apiKeysCount),
      isLoading,
    },
    {
      key: 'apiKeysExpiring',
      label: STAT_TILE_LABELS.apiKeysExpiring,
      value: formatNumber(stats.expiringApiKeysCount),
      isLoading,
    },
  ],
  actions: [
    {
      key: 'createApiKey',
      iconType: 'plusCircle',
      label: i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.createApiKey', {
        defaultMessage: 'Create an API key',
      }),
      onClick: () =>
        application.navigateToApp('management', {
          path: '/security/api_keys/create',
        }),
      testSubj: 'homePageApiKeysCardCreateApiKey',
      telemetryId: 'serverlessVectordb-home-apiKeysCard-createApiKey',
    },
    {
      key: 'manageApiKeys',
      iconType: 'gear',
      label: i18n.translate('xpack.serverlessVectordb.home.apiKeysCard.manageApiKeys', {
        defaultMessage: 'Manage API keys',
      }),
      onClick: () => application.navigateToApp('management', { path: '/security/api_keys' }),
      testSubj: 'homePageApiKeysCardManageApiKeys',
      telemetryId: 'serverlessVectordb-home-apiKeysCard-manageApiKeys',
    },
  ],
});

/** Builds the cards rendered in a row under the data card, in display order. */
export const getSecondaryCards = (deps: StatCardDeps): HomePageStats[] => [
  getDashboardsCard(deps),
  getWorkflowsCard(deps),
  getApiKeysCard(deps),
];
