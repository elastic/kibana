/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { persistRiskScoresToEntityStore } from './persist_risk_scores_to_entity_store';
import { riskScoreServiceMock } from './risk_score_service.mock';

type BulkUpdateEntity = EntityUpdateClient['bulkUpdateEntity'];

const scores = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    riskScoreServiceMock.createRiskScore({ id_value: `host:${index}` })
  );

describe('persistRiskScoresToEntityStore', () => {
  const logger = loggerMock.create();

  const buildClient = (tookMs: number) => {
    const bulkUpdateEntity = jest.fn<ReturnType<BulkUpdateEntity>, Parameters<BulkUpdateEntity>>(
      async ({ onTook }) => {
        onTook?.(tookMs);
        return [];
      }
    );
    return { bulkUpdateEntity };
  };

  it('writes every score in one bulk request by default', async () => {
    const crudClient = buildClient(30);

    const result = await persistRiskScoresToEntityStore({
      crudClient,
      logger,
      scores: { host: scores(10) },
      refresh: false,
    });

    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ force: true, refresh: false })
    );
    expect(crudClient.bulkUpdateEntity.mock.calls[0][0].objects).toHaveLength(10);
    expect(result).toEqual({ docsWritten: 10, unexpectedErrors: [], tookMs: 30 });
  });

  it('splits the write into concurrent chunks and sums their time', async () => {
    const crudClient = buildClient(30);

    const result = await persistRiskScoresToEntityStore({
      crudClient,
      logger,
      scores: { host: scores(10) },
      parallelChunks: 3,
    });

    const chunkSizes = crudClient.bulkUpdateEntity.mock.calls.map(
      ([{ objects }]) => objects.length
    );
    expect(chunkSizes).toEqual([4, 4, 2]);
    expect(result).toEqual({ docsWritten: 10, unexpectedErrors: [], tookMs: 90 });
  });

  it('collects the errors of every chunk', async () => {
    const crudClient = buildClient(0);
    crudClient.bulkUpdateEntity.mockResolvedValueOnce([
      { _id: 'a', status: 500, type: 'boom', reason: 'failed' },
    ]);

    const result = await persistRiskScoresToEntityStore({
      crudClient,
      logger,
      scores: { host: scores(4) },
      parallelChunks: 2,
    });

    expect(result.docsWritten).toBe(3);
    expect(result.unexpectedErrors).toEqual(['[a] failed']);
  });
});
