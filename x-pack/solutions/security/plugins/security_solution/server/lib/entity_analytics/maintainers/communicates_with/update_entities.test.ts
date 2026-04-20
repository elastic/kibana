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
    entityType: 'user',
    communicates_with: ['service:s3.amazonaws.com'],
    ...overrides,
  };
}

function createCrudClient(errors: unknown[] = []): EntityUpdateClient {
  return {
    bulkUpdateEntity: jest.fn().mockResolvedValue(errors),
    updateEntity: jest.fn(),
  } as unknown as EntityUpdateClient;
}

describe('communicates_with updateEntityRelationships', () => {
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

  it('returns 0 without calling the API when all records have empty communicates_with', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ communicates_with: [] }),
      createRecord({ communicates_with: [] }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(0);
    expect(crudClient.bulkUpdateEntity).not.toHaveBeenCalled();
  });

  it('updates only records that have at least one communicates_with target', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@aws',
        communicates_with: ['service:s3.amazonaws.com'],
      }),
      createRecord({ entityId: 'user:bob@acme.com@aws', communicates_with: [] }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.id).toBe('user:alice@acme.com@aws');
  });

  it('passes communicates_with strings directly', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({
      communicates_with: ['service:s3.amazonaws.com', 'service:ec2.amazonaws.com'],
    });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.relationships.communicates_with).toEqual([
      'service:s3.amazonaws.com',
      'service:ec2.amazonaws.com',
    ]);
  });

  it('sets entity.id to entityId', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ entityId: 'user:alice@acme.com@aws' });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].doc.entity.id).toBe('user:alice@acme.com@aws');
  });

  it('uses entityType from the record instead of hardcoding user', async () => {
    const crudClient = createCrudClient();
    const record = createRecord({ entityType: 'host' });
    await updateEntityRelationships(crudClient, logger, [record]);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects[0].type).toBe('host');
  });

  it('calls bulkUpdateEntity with force: true', async () => {
    const crudClient = createCrudClient();
    await updateEntityRelationships(crudClient, logger, [createRecord()]);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ force: true })
    );
  });

  it('returns the count of successfully updated objects', async () => {
    const crudClient = createCrudClient([]);
    const records = [
      createRecord({ entityId: 'user:a@acme.com@aws' }),
      createRecord({ entityId: 'user:b@acme.com@aws' }),
    ];
    const result = await updateEntityRelationships(crudClient, logger, records);
    expect(result).toBe(2);
  });

  it('returns updated count minus errors when some fail', async () => {
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

  it('updates all records in a single bulk call', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({ entityId: 'user:a@acme.com@aws', communicates_with: ['service:s3'] }),
      createRecord({ entityId: 'user:b@acme.com@aws', communicates_with: ['service:ec2'] }),
      createRecord({ entityId: 'user:c@acme.com@aws', communicates_with: ['service:lambda'] }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    expect(crudClient.bulkUpdateEntity).toHaveBeenCalledTimes(1);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(3);
  });

  it('merges communicates_with targets when the same entityId appears from multiple integrations', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:alice@acme.com@entra_id',
        communicates_with: ['service:Microsoft Teams'],
      }),
      createRecord({
        entityId: 'user:alice@acme.com@entra_id',
        communicates_with: ['service:Slack'],
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    expect(objects[0].doc.entity.id).toBe('user:alice@acme.com@entra_id');
    expect(objects[0].doc.entity.relationships.communicates_with).toEqual(
      expect.arrayContaining(['service:Microsoft Teams', 'service:Slack'])
    );
  });

  it('deduplicates identical target strings when merging records', async () => {
    const crudClient = createCrudClient();
    const records = [
      createRecord({
        entityId: 'user:bob@acme.com@aws',
        communicates_with: ['service:s3.amazonaws.com', 'service:ec2.amazonaws.com'],
      }),
      createRecord({
        entityId: 'user:bob@acme.com@aws',
        communicates_with: ['service:s3.amazonaws.com', 'service:lambda.amazonaws.com'],
      }),
    ];
    await updateEntityRelationships(crudClient, logger, records);
    const { objects } = (crudClient.bulkUpdateEntity as jest.Mock).mock.calls[0][0];
    expect(objects).toHaveLength(1);
    const targets = objects[0].doc.entity.relationships.communicates_with;
    expect(targets).toHaveLength(3);
    expect(targets).toEqual(
      expect.arrayContaining([
        'service:s3.amazonaws.com',
        'service:ec2.amazonaws.com',
        'service:lambda.amazonaws.com',
      ])
    );
  });
});
