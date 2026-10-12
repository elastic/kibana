/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { watchlistConfigTypeName } from '../../lib/entity_analytics/watchlists/management/saved_object/watchlist_config_type';
import { watchlistEntitySourceTypeName } from '../../lib/entity_analytics/watchlists/entity_sources/infra/entity_source_type';
import { getInitialWatchlistMetrics, getWatchlistMetrics } from './get_watchlist_metrics';

const toFindResult = (attributes: Record<string, unknown>, namespaces = ['default']) => ({
  id: 'id',
  type: 'type',
  references: [],
  score: 1,
  namespaces,
  attributes,
});

const createSavedObjectsClient = (objectsByType: Record<string, unknown[]>) => {
  const close = jest.fn();
  const createPointInTimeFinder = jest.fn(({ type }: { type: string }) => ({
    async *find() {
      yield { saved_objects: objectsByType[type] ?? [] };
    },
    close,
  }));
  return {
    savedObjectsClient: { createPointInTimeFinder } as unknown as SavedObjectsClientContract,
    createPointInTimeFinder,
    close,
  };
};

describe('getWatchlistMetrics', () => {
  const logger = loggingSystemMock.createLogger();

  it('returns zeros when there are no watchlists', async () => {
    const { savedObjectsClient } = createSavedObjectsClient({});

    const result = await getWatchlistMetrics({ savedObjectsClient, logger });

    expect(result).toEqual(getInitialWatchlistMetrics());
  });

  it('counts watchlists, custom risk modifiers and entity sources across spaces', async () => {
    const { savedObjectsClient, close } = createSavedObjectsClient({
      [watchlistConfigTypeName]: [
        toFindResult({ managed: true, riskModifier: 1.5 }),
        toFindResult({ managed: false, riskModifier: 0.5 }, ['space-a']),
        toFindResult({ managed: false, riskModifier: 2 }, ['space-a']),
      ],
      [watchlistEntitySourceTypeName]: [
        toFindResult({ type: 'index', enabled: true, queryRule: 'user.name: *' }),
        toFindResult({ type: 'entity_analytics_integration', enabled: false, filter: { a: 1 } }),
        toFindResult({ type: 'unknown_type', enabled: true }),
      ],
    });

    const result = await getWatchlistMetrics({ savedObjectsClient, logger });

    expect(result).toEqual({
      watchlists: { total: 3, managed: 1, custom: 2, spaces: 2 },
      custom_risk_modifier: { min: 0.5, max: 2, avg: 1.25 },
      entity_sources: {
        total: 3,
        enabled: 2,
        with_query_rule: 1,
        with_filter: 1,
        by_type: { index: 1, entity_analytics_integration: 1, store: 0 },
      },
    });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('never requests encrypted entity source fields', async () => {
    const { savedObjectsClient, createPointInTimeFinder } = createSavedObjectsClient({});

    await getWatchlistMetrics({ savedObjectsClient, logger });

    const sourceQuery = createPointInTimeFinder.mock.calls.find(
      ([{ type }]) => type === watchlistEntitySourceTypeName
    );
    expect(sourceQuery?.[0]).toEqual(
      expect.objectContaining({
        namespaces: ['*'],
        fields: ['type', 'enabled', 'queryRule', 'filter'],
      })
    );
  });

  it('returns zeros when the saved objects lookup fails', async () => {
    const savedObjectsClient = {
      createPointInTimeFinder: jest.fn(() => {
        throw new Error('boom');
      }),
    } as unknown as SavedObjectsClientContract;

    const result = await getWatchlistMetrics({ savedObjectsClient, logger });

    expect(result).toEqual(getInitialWatchlistMetrics());
  });
});
