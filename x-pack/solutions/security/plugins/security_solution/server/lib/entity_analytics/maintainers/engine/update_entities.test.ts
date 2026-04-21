/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { writeRawIdentifiers } from './update_entities';
import type { ProcessedEngineRecord } from './types';

const makeCrudClient = (errors: Array<{ status: number }> = []): EntityUpdateClient =>
  ({
    bulkUpdateEntity: jest.fn().mockResolvedValue(errors),
  } as unknown as EntityUpdateClient);

describe('writeRawIdentifiers', () => {
  it('returns 0 immediately when records is empty', async () => {
    const crudClient = makeCrudClient();
    const result = await writeRawIdentifiers(crudClient, loggerMock.create(), []);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('skips records with null entityId', async () => {
    const crudClient = makeCrudClient();
    const records: ProcessedEngineRecord[] = [
      { entityId: null, entityType: 'user', relationships: { communicates_with: { 'entity.id': ['host:foo'] } } },
    ];
    const result = await writeRawIdentifiers(crudClient, loggerMock.create(), records);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('skips records where all relationship raw_identifiers are empty', async () => {
    const crudClient = makeCrudClient();
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: {
          accesses_frequently: { 'entity.id': [] },
          accesses_infrequently: { 'entity.id': [] },
        },
      },
    ];
    const result = await writeRawIdentifiers(crudClient, loggerMock.create(), records);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('calls bulkUpdateEntity with the raw_identifiers shape', async () => {
    const crudClient = makeCrudClient();
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: {
          accesses_frequently: { 'entity.id': ['host:web-01'] },
          accesses_infrequently: { 'entity.id': [] },
        },
      },
    ];
    await writeRawIdentifiers(crudClient, loggerMock.create(), records);
    const [call] = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls;
    const { objects } = call[0];
    expect(objects).toHaveLength(1);
    const doc = objects[0].doc.entity.relationships;
    expect(doc.accesses_frequently.raw_identifiers['entity.id']).toEqual(['host:web-01']);
  });

  it('merges records with the same entityId', async () => {
    const crudClient = makeCrudClient();
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:a'] } },
      },
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:b'] } },
      },
    ];
    await writeRawIdentifiers(crudClient, loggerMock.create(), records);
    const [call] = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls;
    const { objects } = call[0];
    expect(objects).toHaveLength(1);
    const ids = objects[0].doc.entity.relationships.communicates_with.raw_identifiers['entity.id'];
    expect(ids.sort()).toEqual(['host:a', 'host:b']);
  });

  it('counts only successfully updated entities', async () => {
    const crudClient = makeCrudClient([{ status: 404 }]);
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:foo'] } },
      },
      {
        entityId: 'user:bob@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:bar'] } },
      },
    ];
    const result = await writeRawIdentifiers(crudClient, loggerMock.create(), records);
    expect(result).toBe(1);
  });

  it('logs 404 errors at debug level, not error', async () => {
    const logger = loggerMock.create();
    const crudClient = makeCrudClient([{ status: 404 }]);
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:foo'] } },
      },
    ];
    await writeRawIdentifiers(crudClient, logger, records);
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs non-404 errors at error level', async () => {
    const logger = loggerMock.create();
    const crudClient = makeCrudClient([{ status: 500 }]);
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:foo'] } },
      },
    ];
    await writeRawIdentifiers(crudClient, logger, records);
    expect(logger.error).toHaveBeenCalled();
  });

  it('calls bulkUpdateEntity with force: true', async () => {
    const crudClient = makeCrudClient();
    const records: ProcessedEngineRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { communicates_with: { 'entity.id': ['host:foo'] } },
      },
    ];
    await writeRawIdentifiers(crudClient, loggerMock.create(), records);
    const [call] = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls;
    expect(call[0].force).toBe(true);
  });
});
