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
  indices: i18n.translate('xpack.serverlessVectordb.home.stats.indices', {
    defaultMessage: 'Indices',
  }),
  vectors: i18n.translate('xpack.serverlessVectordb.home.stats.vectors', {
    defaultMessage: 'Total vectors',
  }),
  storage: i18n.translate('xpack.serverlessVectordb.home.stats.storage', {
    defaultMessage: 'Storage',
  }),
  dashboards: i18n.translate('xpack.serverlessVectordb.home.stats.dashboards', {
    defaultMessage: 'Dashboards',
  }),
  agents: i18n.translate('xpack.serverlessVectordb.home.stats.agents', {
    defaultMessage: 'Agents',
  }),
  workflows: i18n.translate('xpack.serverlessVectordb.home.stats.workflows', {
    defaultMessage: 'Workflows',
  }),
};
