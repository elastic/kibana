/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { StaleEntity } from './soft_delete';
import { bulkRemoveSourceOperationsFactory, REMOVE_SOURCE_SCRIPT } from './soft_delete';

const logger = loggingSystemMock.createLogger();

describe('bulkRemoveSourceOperationsFactory', () => {
  const buildOps = bulkRemoveSourceOperationsFactory(logger);
  const targetIndex = '.entity_analytics.watchlists.test-watchlist-default';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generates update operations with the remove-source script', () => {
    const staleEntities: StaleEntity[] = [
      { docId: 'doc-1', sourceId: 'source-1' },
      { docId: 'doc-2', sourceId: 'source-1' },
    ];

    const ops = buildOps({ staleEntities, sourceType: 'index', targetIndex });

    expect(ops).toHaveLength(4);

    expect(ops[0]).toEqual({ update: { _index: targetIndex, _id: 'doc-1' } });
    expect(ops[1]).toEqual(
      expect.objectContaining({
        script: expect.objectContaining({
          source: REMOVE_SOURCE_SCRIPT,
          params: expect.objectContaining({
            source_id: 'source-1',
            source_type: 'index',
          }),
        }),
      })
    );

    expect(ops[2]).toEqual({ update: { _index: targetIndex, _id: 'doc-2' } });
    expect(ops[3]).toEqual(
      expect.objectContaining({
        script: expect.objectContaining({
          source: REMOVE_SOURCE_SCRIPT,
          params: expect.objectContaining({
            source_id: 'source-1',
            source_type: 'index',
          }),
        }),
      })
    );
  });

  it('returns an empty array when no stale entities are provided', () => {
    const ops = buildOps({ staleEntities: [], sourceType: 'index', targetIndex });
    expect(ops).toHaveLength(0);
  });

  it('includes a valid ISO timestamp in params.now', () => {
    const staleEntities: StaleEntity[] = [{ docId: 'doc-1', sourceId: 'source-1' }];

    const ops = buildOps({ staleEntities, sourceType: 'index', targetIndex });
    const scriptBody = ops[1] as { script: { params: { now: string } } };

    expect(scriptBody.script.params.now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
