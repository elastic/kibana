/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { WatchlistBulkUser } from '../types';
import { bulkUpsertOperationsFactory, UPDATE_SCRIPT_SOURCE } from './upsert';

const logger = loggingSystemMock.createLogger();

describe('bulkUpsertOperationsFactory', () => {
  const buildOps = bulkUpsertOperationsFactory(logger);
  const targetIndex = '.entity-analytics.watchlists.test-watchlist-default';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generates index operations for new users (no existingUserId)', () => {
    const users: WatchlistBulkUser[] = [
      { username: 'alice', sourceId: 'source-1' },
      { username: 'bob', sourceId: 'source-1' },
    ];

    const ops = buildOps({ users, sourceLabel: 'index', targetIndex });

    // Two users → 4 elements (action + doc pairs)
    expect(ops).toHaveLength(4);

    // First user — index action
    expect(ops[0]).toEqual({ index: { _index: targetIndex } });
    // First user — doc body
    expect(ops[1]).toEqual(
      expect.objectContaining({
        user: { name: 'alice' },
        labels: { sources: ['index'], source_ids: ['source-1'] },
      })
    );

    // Second user — index action
    expect(ops[2]).toEqual({ index: { _index: targetIndex } });
    expect(ops[3]).toEqual(
      expect.objectContaining({
        user: { name: 'bob' },
        labels: { sources: ['index'], source_ids: ['source-1'] },
      })
    );
  });

  it('generates update operations for existing users (with existingUserId)', () => {
    const users: WatchlistBulkUser[] = [
      { username: 'alice', existingUserId: 'doc-123', sourceId: 'source-2' },
    ];

    const ops = buildOps({ users, sourceLabel: 'index', targetIndex });

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

  it('generates mixed operations for a mix of new and existing users', () => {
    const users: WatchlistBulkUser[] = [
      { username: 'new-user', sourceId: 'src-1' },
      { username: 'existing-user', existingUserId: 'doc-456', sourceId: 'src-1' },
    ];

    const ops = buildOps({ users, sourceLabel: 'index', targetIndex });

    expect(ops).toHaveLength(4);

    // First is an index op
    expect(ops[0]).toEqual({ index: { _index: targetIndex } });

    // Second pair is an update op
    expect(ops[2]).toEqual({ update: { _index: targetIndex, _id: 'doc-456' } });
  });

  it('returns an empty array when no users are provided', () => {
    const ops = buildOps({ users: [], sourceLabel: 'index', targetIndex });
    expect(ops).toHaveLength(0);
  });
});
