/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { EntitySourceType } from '../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { watchlistConfigTypeName } from '../../lib/entity_analytics/watchlists/management/saved_object/watchlist_config_type';
import { watchlistEntitySourceTypeName } from '../../lib/entity_analytics/watchlists/entity_sources/infra/entity_source_type';
import type { WatchlistMetrics } from './types';

const PER_PAGE = 1000;

interface WatchlistConfigFields {
  managed?: boolean;
  riskModifier?: number;
}

interface EntitySourceFields {
  type?: string;
  enabled?: boolean;
  queryRule?: string;
  filter?: unknown;
}

export const getInitialWatchlistMetrics = (): WatchlistMetrics => ({
  watchlists: { total: 0, managed: 0, custom: 0, spaces: 0 },
  custom_risk_modifier: { min: 0, max: 0, avg: 0 },
  entity_sources: {
    total: 0,
    enabled: 0,
    with_query_rule: 0,
    with_filter: 0,
    by_type: { index: 0, entity_analytics_integration: 0, store: 0 },
  },
});

const findAll = async <T>(
  savedObjectsClient: SavedObjectsClientContract,
  type: string,
  fields: string[]
): Promise<Array<SavedObjectsFindResult<T>>> => {
  const finder = savedObjectsClient.createPointInTimeFinder<T>({
    type,
    fields,
    perPage: PER_PAGE,
    namespaces: ['*'],
  });
  const results: Array<SavedObjectsFindResult<T>> = [];
  try {
    for await (const response of finder.find()) {
      results.push(...response.saved_objects);
    }
  } finally {
    await finder.close();
  }
  return results;
};

/** Counts watchlists and their entity sources across all spaces, without names or queries. */
export const getWatchlistMetrics = async ({
  savedObjectsClient,
  logger,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<WatchlistMetrics> => {
  const metrics = getInitialWatchlistMetrics();
  try {
    const [watchlists, entitySources] = await Promise.all([
      findAll<WatchlistConfigFields>(savedObjectsClient, watchlistConfigTypeName, [
        'managed',
        'riskModifier',
      ]),
      // Never request `apiKey`: it is encrypted and must not be read here.
      findAll<EntitySourceFields>(savedObjectsClient, watchlistEntitySourceTypeName, [
        'type',
        'enabled',
        'queryRule',
        'filter',
      ]),
    ]);

    const spaces = new Set<string>();
    const customRiskModifiers: number[] = [];
    for (const { attributes, namespaces } of watchlists) {
      metrics.watchlists.total++;
      namespaces?.forEach((namespace) => spaces.add(namespace));
      if (attributes.managed) {
        metrics.watchlists.managed++;
      } else {
        metrics.watchlists.custom++;
        if (typeof attributes.riskModifier === 'number') {
          customRiskModifiers.push(attributes.riskModifier);
        }
      }
    }
    metrics.watchlists.spaces = spaces.size;

    if (customRiskModifiers.length > 0) {
      metrics.custom_risk_modifier = {
        min: Math.min(...customRiskModifiers),
        max: Math.max(...customRiskModifiers),
        avg:
          customRiskModifiers.reduce((sum, value) => sum + value, 0) / customRiskModifiers.length,
      };
    }

    const { by_type: byType } = metrics.entity_sources;
    for (const { attributes } of entitySources) {
      metrics.entity_sources.total++;
      if (attributes.enabled) {
        metrics.entity_sources.enabled++;
      }
      if (attributes.queryRule) {
        metrics.entity_sources.with_query_rule++;
      }
      if (attributes.filter) {
        metrics.entity_sources.with_filter++;
      }
      const sourceType = EntitySourceType.safeParse(attributes.type);
      if (sourceType.success) {
        byType[sourceType.data]++;
      }
    }

    return metrics;
  } catch (error) {
    logger.debug(`Error fetching watchlist metrics: ${error.message}`);
    return getInitialWatchlistMetrics();
  }
};
