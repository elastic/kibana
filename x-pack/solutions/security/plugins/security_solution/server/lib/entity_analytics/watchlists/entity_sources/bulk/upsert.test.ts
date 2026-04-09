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

  it('generates index operations for new entities (no existingEntityId)', () => {
    const entities: WatchlistBulkEntity[] = [
      { euid: 'user:alice', type: 'user', name: 'alice', sourceId: 'source-1' },
      { euid: 'user:bob', type: 'user', name: 'bob', sourceId: 'source-1' },
    ];

    const ops = buildOps({ entities, sourceLabel: 'index', targetIndex });

    // Two entities → 4 elements (action + doc pairs)
    expect(ops).toHaveLength(4);

    // First entity — index action
    expect(ops[0]).toEqual({ index: { _index: targetIndex, _id: 'user:alice' } });
    // First entity — doc body
    expect(ops[1]).toEqual(
      expect.objectContaining({
        entity: { id: 'user:alice', name: 'alice', type: 'user' },
        labels: { sources: ['index'], source_ids: ['source-1'] },
        watchlist,
      })
    );

    // Second entity — index action
    expect(ops[2]).toEqual({ index: { _index: targetIndex, _id: 'user:bob' } });
    expect(ops[3]).toEqual(
      expect.objectContaining({
        entity: { id: 'user:bob', name: 'bob', type: 'user' },
        labels: { sources: ['index'], source_ids: ['source-1'] },
        watchlist,
      })
    );
  });

  it('generates update operations for existing entities (with existingEntityId)', () => {
    const entities: WatchlistBulkEntity[] = [
      {
        euid: 'user:alice',
        type: 'user',
        name: 'alice',
        existingEntityId: 'doc-123',
        sourceId: 'source-2',
      },
    ];

    const ops = buildOps({ entities, sourceLabel: 'index', targetIndex });

    expect(ops).toHaveLength(2);

    // Update action
    expect(ops[0]).toEqual({ update: { _index: targetIndex, _id: 'doc-123' } });
    // Script body
    expect(ops[1]).toEqual(
      expect.objectContaining({
        script: expect.objectContaining({
          source: UPDATE_SCRIPT_SOURCE,
          params: expect.objectContaining({
            source_id: 'source-2',
            source_type: 'index',
          }),
        }),
      })
    );
  });

  it('generates mixed operations for a mix of new and existing entities', () => {
    const entities: WatchlistBulkEntity[] = [
      { euid: 'user:new-user', type: 'user', name: 'new-user', sourceId: 'src-1' },
      {
        euid: 'user:existing-user',
        type: 'user',
        name: 'existing-user',
        existingEntityId: 'doc-456',
        sourceId: 'src-1',
      },
    ];

    const ops = buildOps({ entities, sourceLabel: 'index', targetIndex });

    expect(ops).toHaveLength(4);

    // First is an index op
    expect(ops[0]).toEqual({ index: { _index: targetIndex, _id: 'user:new-user' } });

    // Second pair is an update op
    expect(ops[2]).toEqual({ update: { _index: targetIndex, _id: 'doc-456' } });
  });

  it('returns an empty array when no entities are provided', () => {
    const ops = buildOps({ entities: [], sourceLabel: 'index', targetIndex });
    expect(ops).toHaveLength(0);
  });
});
