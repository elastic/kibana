/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BANNER_DISMISSED_KEY = 'vectordb.home.banner.dismissed';

export const HOME_PAGE_BANNER_COPY = {
  hasData: {
    title: i18n.translate('xpack.serverlessVectordb.home.banner.returningUser.title', {
      defaultMessage: 'Explore our full embedding model library',
    }),
    description: i18n.translate('xpack.serverlessVectordb.home.banner.returningUser.description', {
      defaultMessage: 'Quickly start ingesting and searching vectors with our guided setup.',
    }),
    buttonLabel: i18n.translate('xpack.serverlessVectordb.home.banner.returningUser.viewModels', {
      defaultMessage: 'View models',
    }),
  },
  noData: {
    title: i18n.translate('xpack.serverlessVectordb.home.banner.emptyState.title', {
      defaultMessage: 'Set up your vector database in 2 simple steps.',
    }),
    description: i18n.translate('xpack.serverlessVectordb.home.banner.emptyState.description', {
      defaultMessage:
        'Use our getting started wizard or browse documentation, articles and notebooks.',
    }),
    buttonLabel: i18n.translate('xpack.serverlessVectordb.home.banner.emptyState.getStarted', {
      defaultMessage: 'Get started',
    }),
  },
};

export const STAT_TILE_LABELS = {
  totalIndices: i18n.translate('xpack.serverlessVectordb.home.stats.totalIndices', {
    defaultMessage: 'Total indices',
  }),
  documents: i18n.translate('xpack.serverlessVectordb.home.stats.documents', {
    defaultMessage: 'Documents',
  }),
  vectors: i18n.translate('xpack.serverlessVectordb.home.stats.vectors', {
    defaultMessage: 'Vectors',
  }),
  totalSize: i18n.translate('xpack.serverlessVectordb.home.stats.totalSize', {
    defaultMessage: 'Total size',
  }),
  modelUsage: i18n.translate('xpack.serverlessVectordb.home.stats.modelUsage', {
    defaultMessage: 'Model usage',
  }),
  dashboardsTotal: i18n.translate('xpack.serverlessVectordb.home.stats.dashboardsTotal', {
    defaultMessage: 'Total',
  }),
  dashboardsStarred: i18n.translate('xpack.serverlessVectordb.home.stats.dashboardsStarred', {
    defaultMessage: 'Starred',
  }),
  workflowsTotal: i18n.translate('xpack.serverlessVectordb.home.stats.workflowsTotal', {
    defaultMessage: 'Total',
  }),
  workflowsRunning: i18n.translate('xpack.serverlessVectordb.home.stats.workflowsRunning', {
    defaultMessage: 'Running',
  }),
  apiKeysTotal: i18n.translate('xpack.serverlessVectordb.home.stats.apiKeysTotal', {
    defaultMessage: 'Total',
  }),
  apiKeysExpiring: i18n.translate('xpack.serverlessVectordb.home.stats.apiKeysExpiring', {
    defaultMessage: 'Expiring',
  }),
};

/**
 * Placeholder stats
 */
export const PLACEHOLDER_DEPLOYMENT_STATS = {
  vectorsCount: null as number | null,
} as const;
