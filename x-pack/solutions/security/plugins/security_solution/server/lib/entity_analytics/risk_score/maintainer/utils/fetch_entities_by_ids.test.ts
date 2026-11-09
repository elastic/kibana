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

  it('fetches a single chunk with one request and the same source fields', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [buildStoreEntity('host:1'), buildStoreEntity('host:2')],
    });

    const result = await fetchEntitiesByIds({
      crudClient,
      entityIds: ['host:1', 'host:2'],
      logger,
      errorContext: 'ctx',
    });

    expect(result.size).toBe(2);
    expect(crudClient.listEntities).toHaveBeenCalledTimes(1);
    expect(crudClient.listEntities).toHaveBeenCalledWith({
      filter: { terms: { 'entity.id': ['host:1', 'host:2'] } },
      size: 2,
      source: [
        'entity.id',
        'entity.attributes.watchlists',
        'entity.relationships.resolution.resolved_to',
        'asset.criticality',
      ],
    });
  });

  describe('chunking', () => {
    const buildIds = (count: number) => Array.from({ length: count }, (_, i) => `host:${i}`);
    const echoIds = () =>
      (crudClient.listEntities as jest.Mock).mockImplementation(async ({ filter }) => ({
        entities: filter.terms['entity.id'].map(buildStoreEntity),
      }));
    const requestedChunks = (): string[][] =>
      (crudClient.listEntities as jest.Mock).mock.calls.map(
        ([params]) => params.filter.terms['entity.id']
      );

    it('splits more than 10,000 ids into chunks and merges every chunk', async () => {
      echoIds();

      const result = await fetchEntitiesByIds({
        crudClient,
        entityIds: buildIds(11_000),
        logger,
        errorContext: 'ctx',
      });

      expect(result.size).toBe(11_000);
      expect(requestedChunks().map((chunk) => chunk.length)).toEqual([10_000, 1_000]);
    });

    it('splits more than 65,536 ids with every chunk at or below 10,000', async () => {
      echoIds();

      const result = await fetchEntitiesByIds({
        crudClient,
        entityIds: buildIds(70_000),
        logger,
        errorContext: 'ctx',
      });

      const chunks = requestedChunks();
      expect(result.size).toBe(70_000);
      expect(chunks).toHaveLength(7);
      chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(10_000));
      for (const [params] of (crudClient.listEntities as jest.Mock).mock.calls) {
        expect(params.size).toBe(params.filter.terms['entity.id'].length);
        expect(params.searchAfter).toBeUndefined();
      }
    });

    it('removes duplicate ids before chunking', async () => {
      echoIds();

      const result = await fetchEntitiesByIds({
        crudClient,
        entityIds: [...buildIds(6_000), ...buildIds(6_000)],
        logger,
        errorContext: 'ctx',
      });

      expect(result.size).toBe(6_000);
      expect(requestedChunks()).toHaveLength(1);
      expect(requestedChunks()[0]).toHaveLength(6_000);
    });

    it('fails the whole fetch and calls onError when a later chunk fails', async () => {
      (crudClient.listEntities as jest.Mock)
        .mockResolvedValueOnce({ entities: [buildStoreEntity('host:1')] })
        .mockRejectedValueOnce(new Error('es down'));
      const onError = jest.fn();

      const result = await fetchEntitiesByIds({
        crudClient,
        entityIds: buildIds(10_001),
        logger,
        errorContext: 'modifier lookup failed',
        onError,
      });

      expect(result.size).toBe(0);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('modifier lookup failed'));
    });

    it('propagates a later chunk failure when strict is true', async () => {
      (crudClient.listEntities as jest.Mock)
        .mockResolvedValueOnce({ entities: [buildStoreEntity('host:1')] })
        .mockRejectedValueOnce(new Error('es down'));
      const onError = jest.fn();

      await expect(
        fetchEntitiesByIds({
          crudClient,
          entityIds: buildIds(10_001),
          logger,
          errorContext: 'ctx',
          strict: true,
          onError,
        })
      ).rejects.toThrow('es down');
      expect(onError).toHaveBeenCalledTimes(1);
    });
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
