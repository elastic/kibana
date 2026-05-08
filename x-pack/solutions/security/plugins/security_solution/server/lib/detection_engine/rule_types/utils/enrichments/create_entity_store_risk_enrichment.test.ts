/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityStoreEnrichment } from './create_entity_store_risk_enrichment';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { createAlert } from './__mocks__/alerts';
import type { EnrichmentFunction } from './types';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { euid } from '@kbn/entity-store/common/euid_helpers';

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    getEuidFromObject: jest.fn(),
  },
}));

const mockGetEuidFromObject = euid.getEuidFromObject as jest.Mock;

const makeEntity = (id: string, extraFields: Record<string, unknown> = {}) => ({
  entity: { id },
  ...extraFields,
});

const makeEntityStoreCrudClient = (
  entities: Array<ReturnType<typeof makeEntity>> = []
): EntityStoreCRUDClient =>
  ({
    listEntities: jest.fn().mockResolvedValue({ entities }),
  } as unknown as EntityStoreCRUDClient);

describe('createEntityStoreEnrichment', () => {
  let logger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;
  const enrichFn: EnrichmentFunction = (a) => a;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = ruleExecutionLogMock.forExecutors.create();
    mockGetEuidFromObject.mockReset();
  });

  it('returns empty object when no events have a computable EUID', async () => {
    mockGetEuidFromObject.mockReturnValue(undefined);
    const crudClient = makeEntityStoreCrudClient();

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [createAlert('1'), createAlert('2')],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(crudClient.listEntities).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('returns empty object when listEntities finds no matching entities', async () => {
    mockGetEuidFromObject.mockReturnValue('host:server1');
    const crudClient = makeEntityStoreCrudClient();

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [createAlert('1', { host: { name: 'server1' } })],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.id': ['host:server1'] } },
        size: 1,
        fields: ['entity.id', 'entity.risk.calculated_level'],
      })
    );
    expect(result).toEqual({});
  });

  it('returns enriched map for events whose EUID matches an entity', async () => {
    mockGetEuidFromObject.mockImplementation((_, doc) =>
      doc?.host?.name ? `host:${doc.host.name}` : undefined
    );

    const crudClient = makeEntityStoreCrudClient([
      makeEntity('host:server1', { 'entity.risk.calculated_level': 'High' }),
    ]);

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [
        createAlert('1', { host: { name: 'server1' } }),
        createAlert('2', { host: { name: 'no-match' } }),
      ],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.id': ['host:server1', 'host:no-match'] } },
        size: 2,
        fields: ['entity.id', 'entity.risk.calculated_level'],
      })
    );
    expect(result).toEqual({ '1': [enrichFn] });
  });

  it('enriches all events sharing the same EUID', async () => {
    mockGetEuidFromObject.mockReturnValue('host:server1');

    const crudClient = makeEntityStoreCrudClient([makeEntity('host:server1')]);

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [
        createAlert('1', { host: { name: 'server1' } }),
        createAlert('2', { host: { name: 'server1' } }),
        createAlert('3', { host: { name: 'server1' } }),
      ],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.id': ['host:server1'] } },
        size: 1,
        fields: ['entity.id', 'entity.risk.calculated_level'],
      })
    );

    expect(result).toEqual({ '1': [enrichFn], '2': [enrichFn], '3': [enrichFn] });
  });

  it('enriches multiple events sharing the EUIDs', async () => {
    mockGetEuidFromObject.mockReturnValueOnce('host:server1');
    mockGetEuidFromObject.mockReturnValueOnce('host:server1');
    mockGetEuidFromObject.mockReturnValueOnce('host:server1');
    mockGetEuidFromObject.mockReturnValueOnce('host:server2');
    mockGetEuidFromObject.mockReturnValueOnce('host:server2');

    const crudClient = makeEntityStoreCrudClient([
      makeEntity('host:server1'),
      makeEntity('host:server2'),
    ]);

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [
        createAlert('1', { host: { name: 'server1' } }),
        createAlert('2', { host: { name: 'server1' } }),
        createAlert('3', { host: { name: 'server1' } }),
        createAlert('4', { host: { name: 'server2' } }),
        createAlert('5', { host: { name: 'server2' } }),
      ],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.id': ['host:server1', 'host:server2'] } },
        size: 2,
        fields: ['entity.id', 'entity.risk.calculated_level'],
      })
    );

    expect(result).toEqual({
      '1': [enrichFn],
      '2': [enrichFn],
      '3': [enrichFn],
      '4': [enrichFn],
      '5': [enrichFn],
    });
  });

  it('makes multiple listEntities calls when unique EUIDs exceed CHUNK_SIZE', async () => {
    const totalEvents = 2500;
    const events = Array.from({ length: totalEvents }, (_, i) =>
      createAlert(String(i), { host: { name: `server${i}` } })
    );
    mockGetEuidFromObject.mockImplementation((_, doc) =>
      doc?.host?.name ? `host:${doc.host.name}` : undefined
    );

    const allEntities = Array.from({ length: totalEvents }, (_, i) =>
      makeEntity(`host:server${i}`)
    );

    // listEntities returns a slice of entities matching the requested chunk
    const crudClient = {
      listEntities: jest.fn().mockImplementation(({ filter }) => {
        const requestedIds: string[] = filter.terms['entity.id'];
        return Promise.resolve({
          entities: allEntities.filter((e) => requestedIds.includes(e.entity.id)),
        });
      }),
    } as unknown as EntityStoreCRUDClient;

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events,
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    // 2500 unique EUIDs → 3 chunks (1000 + 1000 + 500)
    expect((crudClient.listEntities as jest.Mock).mock.calls.length).toBe(3);
    expect(Object.keys(result).length).toBe(totalEvents);
  });

  it('returns empty object and does not throw when listEntities throws', async () => {
    mockGetEuidFromObject.mockReturnValue('host:server1');

    const crudClient = {
      listEntities: jest.fn().mockRejectedValue(new Error('ES error')),
    } as unknown as EntityStoreCRUDClient;

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [createAlert('1', { host: { name: 'server1' } })],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(result).toEqual({});
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns empty object and logs a warning when an error is thrown outside listEntities', async () => {
    mockGetEuidFromObject.mockImplementation(() => {
      throw new Error('unexpected error');
    });

    const crudClient = makeEntityStoreCrudClient();

    const result = await createEntityStoreEnrichment({
      name: 'Host Risk',
      entityType: 'host',
      entityStoreCrudClient: crudClient,
      logger,
      events: [createAlert('1', { host: { name: 'server1' } })],
      enrichmentFields: ['entity.risk.calculated_level'],
      createEnrichmentFunction: () => enrichFn,
    });

    expect(result).toEqual({});
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Host Risk'));
  });
});
