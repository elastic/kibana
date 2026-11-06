/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { WatchlistMetrics } from './types';

export const watchlistMetricsSchema: MakeSchemaFrom<WatchlistMetrics> = {
  watchlists: {
    total: {
      type: 'long',
      _meta: { description: 'Total number of watchlists across all spaces' },
    },
    managed: {
      type: 'long',
      _meta: { description: 'Number of managed (prebuilt) watchlists' },
    },
    custom: {
      type: 'long',
      _meta: { description: 'Number of custom watchlists' },
    },
    spaces: {
      type: 'long',
      _meta: { description: 'Number of spaces with at least one watchlist' },
    },
  },
  custom_risk_modifier: {
    min: {
      type: 'float',
      _meta: { description: 'Lowest risk modifier across custom watchlists; 0 when none exist' },
    },
    max: {
      type: 'float',
      _meta: { description: 'Highest risk modifier across custom watchlists; 0 when none exist' },
    },
    avg: {
      type: 'float',
      _meta: { description: 'Average risk modifier across custom watchlists; 0 when none exist' },
    },
  },
  entity_sources: {
    total: {
      type: 'long',
      _meta: { description: 'Total number of watchlist entity sources across all spaces' },
    },
    enabled: {
      type: 'long',
      _meta: { description: 'Number of enabled watchlist entity sources' },
    },
    with_query_rule: {
      type: 'long',
      _meta: { description: 'Number of entity sources with a KQL query rule' },
    },
    with_filter: {
      type: 'long',
      _meta: { description: 'Number of entity sources with a filter' },
    },
    by_type: {
      index: {
        type: 'long',
        _meta: { description: 'Number of entity sources of type "index"' },
      },
      entity_analytics_integration: {
        type: 'long',
        _meta: { description: 'Number of entity sources of type "entity_analytics_integration"' },
      },
      store: {
        type: 'long',
        _meta: { description: 'Number of entity sources of type "store"' },
      },
    },
  },
};
