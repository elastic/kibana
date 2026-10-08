/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { ScopedLogger } from './with_log_context';
import { fetchEntitiesByIds } from './fetch_entities_by_ids';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

const buildStoreEntity = (id: string) => ({
  entity: {
    id,
    attributes: { watchlists: [] },
    relationships: { resolution: { resolved_to: undefined } },
  },
  asset: { criticality: undefined },
});

describe('fetchEntitiesByIds', () => {
  let crudClient: EntityUpdateClient;
  let logger: ScopedLogger;

  beforeEach(() => {
    crudClient = { listEntities: jest.fn() } as unknown as EntityUpdateClient;
    logger = buildLogger();
  });

  it('returns an empty map without calling listEntities when entityIds is empty', async () => {
    const result = await fetchEntitiesByIds({
      crudClient,
      entityIds: [],
      logger,
      errorContext: 'ctx',
    });

    expect(result.size).toBe(0);
    expect(crudClient.listEntities).not.toHaveBeenCalled();
  });

  it('paginates via searchAfter until nextSearchAfter is undefined', async () => {
    (crudClient.listEntities as jest.Mock)
      .mockResolvedValueOnce({
        entities: [buildStoreEntity('host:1')],
        nextSearchAfter: ['a'],
      })
      .mockResolvedValueOnce({
        entities: [buildStoreEntity('host:2')],
        nextSearchAfter: undefined,
      });

    const result = await fetchEntitiesByIds({
      crudClient,
      entityIds: ['host:1', 'host:2'],
      logger,
      errorContext: 'ctx',
    });

    expect(result.size).toBe(2);
    expect(crudClient.listEntities).toHaveBeenCalledTimes(2);
    expect((crudClient.listEntities as jest.Mock).mock.calls[1][0].searchAfter).toEqual(['a']);
  });

  describe('best-effort vs strict lookup failures', () => {
    it('swallows a lookup failure and logs a warning by default (strict: false)', async () => {
      (crudClient.listEntities as jest.Mock).mockRejectedValue(new Error('es down'));

      const result = await fetchEntitiesByIds({
        crudClient,
        entityIds: ['host:1'],
        logger,
        errorContext: 'modifier lookup failed',
      });

      expect(result.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('modifier lookup failed'));
    });

    it('propagates the error instead of swallowing it when strict is true', async () => {
      (crudClient.listEntities as jest.Mock).mockRejectedValue(new Error('es down'));

      await expect(
        fetchEntitiesByIds({
          crudClient,
          entityIds: ['host:1'],
          logger,
          errorContext: 'modifier lookup failed',
          strict: true,
        })
      ).rejects.toThrow('es down');
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
