/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { updateEntityRelationships } from './update_entities';
import type { ProcessedEntityRecord } from './types';

function createRecord(overrides?: Partial<ProcessedEntityRecord>): ProcessedEntityRecord {
  return {
    entityId: 'user:alice@acme.com@aws',
    accesses_frequently: { ids: ['host:workstation-01'] },
    accesses_infrequently: { ids: [] },
    ...overrides,
  };
}

function createCrudClient(errors: unknown[] = []): EntityUpdateClient {
  return {
    bulkUpdateEntity: jest.fn().mockResolvedValue(errors),
    updateEntity: jest.fn(),
  } as unknown as EntityUpdateClient;
}

describe('accesses updateEntityRelationships', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 without calling the API when records is empty', async () => {
    const crudClient = createCrudClient();
    const result = await updateEntityRelationships(crudClient, logger, []);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('returns 0 without calling the API when all records have null entityId', async () => {
    const crudClient = createCrudClient();
    const records = [createRecord({ entityId: null }), createRecord({ entityId: null })];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('skips null entityId records without producing a bulk object', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: null, accesses_frequently: { ids: ['host:ghost'] } }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: ['host:workstation-01'] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.id).toBe('user:alice@acme.com@aws');
  });

  it('merges frequently IDs when the same entityId appears from two integrations', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: ['host:workstation-01'] },
        accesses_infrequently: { ids: [] },
      }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: ['host:server-99'] },
        accesses_infrequently: { ids: [] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.relationships.accesses_frequently.ids).toEqual(
      expect.arrayContaining(['host:workstation-01', 'host:server-99'])
    );
  });

  it('merges infrequently IDs when the same entityId appears from two integrations', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:lab-01'] },
      }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:lab-02'] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.relationships.accesses_infrequently.ids).toEqual(
      expect.arrayContaining(['host:lab-01', 'host:lab-02'])
    );
  });

  it('applies precedence: host in frequently from one integration wins over infrequently from another', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: ['host:shared-host'] },
        accesses_infrequently: { ids: [] },
      }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:shared-host'] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    const rel = objects[0].doc.entity.relationships;
    expect(rel.accesses_frequently.ids).toContain('host:shared-host');
    expect(rel.accesses_infrequently).toBeUndefined();
  });

  it('host only ever in infrequently stays in infrequently', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:rare-host'] },
      }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:rare-host'] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    const rel = objects[0].doc.entity.relationships;
    expect(rel.accesses_infrequently.ids).toContain('host:rare-host');
    expect(rel.accesses_frequently).toBeUndefined();
  });

  it('calls bulkUpdateEntity exactly once regardless of record count', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: 'user:a@acme.com@aws' }),
      createRecord({ entityId: 'user:b@acme.com@aws' }),
      createRecord({ entityId: 'user:c@acme.com@aws' }),
      createRecord({
        entityId: 'user:a@acme.com@aws',
        accesses_frequently: { ids: ['host:extra'] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
  });

  it('returns the count of successfully updated entities (post-merge)', async () => {
    const crudClient = createCrudClient([]);
    const records = [
      createRecord({ entityId: 'user:a@acme.com@aws' }),
      createRecord({
        entityId: 'user:a@acme.com@aws',
        accesses_frequently: { ids: ['host:extra'] },
      }),
      createRecord({ entityId: 'user:b@acme.com@aws' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    // 3 records merge to 2 entities — result is 2
    expect(result).toBe(2);
  });

  it('returns updated count minus errors', async () => {
    const errors = [{ _id: 'hash1', status: 429, type: 'too_many_requests', reason: 'throttled' }];
    const crudClient = createCrudClient(errors);
    const records = [
      createRecord({ entityId: 'user:a@acme.com@aws' }),
      createRecord({ entityId: 'user:b@acme.com@aws' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update 1'));
  });

  it('calls bulkUpdateEntity with force: true', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    );
  });

  it('deduplicates frequently IDs when the same host appears in multiple records', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: ['host:workstation-01', 'host:server-99'] },
        accesses_infrequently: { ids: [] },
      }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: ['host:workstation-01', 'host:server-42'] },
        accesses_infrequently: { ids: [] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    const ids = objects[0].doc.entity.relationships.accesses_frequently.ids;
    expect(ids).toHaveLength(3);
    expect(ids).toEqual(
      expect.arrayContaining(['host:workstation-01', 'host:server-99', 'host:server-42'])
    );
  });

  it('deduplicates infrequently IDs when the same host appears in multiple records', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:lab-01', 'host:lab-02'] },
      }),
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        accesses_frequently: { ids: [] },
        accesses_infrequently: { ids: ['host:lab-01', 'host:lab-03'] },
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    const ids = objects[0].doc.entity.relationships.accesses_infrequently.ids;
    expect(ids).toHaveLength(3);
    expect(ids).toEqual(expect.arrayContaining(['host:lab-01', 'host:lab-02', 'host:lab-03']));
  });

  it('sets the bulk object type to user', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].type).toBe('user');
  });
});
