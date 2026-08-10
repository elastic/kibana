/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { WatchlistBulkEntity } from '../types';
import { bulkUpsertOperationsFactory, UPDATE_SCRIPT_SOURCE } from './upsert';

const logger = loggingSystemMock.createLogger();

describe('bulkUpsertOperationsFactory', () => {
  const watchlist = { name: 'test-watchlist', id: 'watchlist-1' };
  const buildOps = bulkUpsertOperationsFactory(logger, watchlist);
  const targetIndex = '.entity-analytics.watchlists.test-watchlist-default';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generates scripted upsert operations for new entities', () => {
    const entities: WatchlistBulkEntity[] = [
      { euid: 'user:alice', type: 'user', name: 'alice', sourceId: 'source-1' },
      { euid: 'user:bob', type: 'user', name: 'bob', sourceId: 'source-1' },
    ];

    const ops = buildOps({ entities, sourceLabel: 'index', targetIndex });

    // Two entities → 4 elements (action + body pairs)
    expect(ops).toHaveLength(4);

    // First entity — update action with deterministic _id
    expect(ops[0]).toEqual({ update: { _index: targetIndex, _id: 'watchlist-1:user:alice' } });
    // First entity — scripted upsert body
    expect(ops[1]).toEqual(
      expect.objectContaining({
        script: expect.objectContaining({
          source: UPDATE_SCRIPT_SOURCE,
          params: expect.objectContaining({ source_id: 'source-1', source_type: 'index' }),
        }),
        upsert: expect.objectContaining({
          entity: { id: 'user:alice', name: 'alice', type: 'user' },
          labels: { sources: ['index'], source_ids: ['source-1'] },
          watchlist,
        }),
      })
    );

    // Second entity
    expect(ops[2]).toEqual({ update: { _index: targetIndex, _id: 'watchlist-1:user:bob' } });
    expect(ops[3]).toEqual(
      expect.objectContaining({
        script: expect.objectContaining({ source: UPDATE_SCRIPT_SOURCE }),
        upsert: expect.objectContaining({
          entity: { id: 'user:bob', name: 'bob', type: 'user' },
        }),
      })
    );
  });

  it('generates scripted upsert operations for existing entities, merging source labels', () => {
    const entities: WatchlistBulkEntity[] = [
      { euid: 'user:alice', type: 'user', name: 'alice', sourceId: 'source-2' },
    ];

    const ops = buildOps({ entities, sourceLabel: 'index', targetIndex });

    expect(ops).toHaveLength(2);

    expect(ops[0]).toEqual({ update: { _index: targetIndex, _id: 'watchlist-1:user:alice' } });
    expect(ops[1]).toEqual(
      expect.objectContaining({
        script: expect.objectContaining({
          source: UPDATE_SCRIPT_SOURCE,
          params: expect.objectContaining({ source_id: 'source-2', source_type: 'index' }),
        }),
        upsert: expect.objectContaining({
          labels: expect.objectContaining({ source_ids: ['source-2'] }),
        }),
      })
    );
  });

  it('returns an empty array when no entities are provided', () => {
    const ops = buildOps({ entities: [], sourceLabel: 'index', targetIndex });
    expect(ops).toHaveLength(0);
  });
});
