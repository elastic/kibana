/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import {
  checkEntitiesExist,
  checkEntityExists,
  EntityStoreAccessError,
} from './check_entity_exists';

describe('checkEntityExists', () => {
  const listEntities = jest.fn();
  const latestIndexName = jest.fn();
  const hasPrivileges = jest.fn();
  const crudClient = { listEntities, latestIndexName } as unknown as EntityStoreCRUDClient;
  const esClient = {
    security: { hasPrivileges },
  } as unknown as ElasticsearchClient;

  beforeEach(() => {
    listEntities.mockReset();
    latestIndexName.mockReset();
    hasPrivileges.mockReset();
    latestIndexName.mockResolvedValue('.entities.v2.latest.default-00001');
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
  });

  it('returns the entity record when a matching entity is found', async () => {
    const entity = { entity: { id: 'host:abc123' } };
    listEntities.mockResolvedValue({ entities: [entity] });

    const result = await checkEntityExists({
      crudClient,
      esClient,
      entityId: 'host:abc123',
      entityType: 'host',
    });

    expect(result).toBe(entity);
  });

  it('returns null when no matching entity is found', async () => {
    listEntities.mockResolvedValue({ entities: [] });

    const result = await checkEntityExists({
      crudClient,
      esClient,
      entityId: 'host:does-not-exist',
      entityType: 'host',
    });

    expect(result).toBeNull();
  });

  it('filters by both entity.id and entity.EngineMetadata.Type', async () => {
    listEntities.mockResolvedValue({ entities: [] });

    await checkEntityExists({
      crudClient,
      esClient,
      entityId: 'user:jane@okta',
      entityType: 'user',
    });

    expect(listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: [
          { terms: { 'entity.id': ['user:jane@okta'] } },
          { term: { 'entity.EngineMetadata.Type': 'user' } },
        ],
        size: 1,
      })
    );
  });

  it('throws EntityStoreAccessError when user lacks read privilege on the index', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: false });

    await expect(
      checkEntityExists({ crudClient, esClient, entityId: 'host:abc123', entityType: 'host' })
    ).rejects.toThrow(EntityStoreAccessError);

    expect(listEntities).not.toHaveBeenCalled();
  });

  it('checks privileges against the resolved latest index name', async () => {
    listEntities.mockResolvedValue({ entities: [] });

    await checkEntityExists({
      crudClient,
      esClient,
      entityId: 'host:abc123',
      entityType: 'host',
    });

    expect(hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['.entities.v2.latest.default-00001'], privileges: ['read'] }],
    });
  });

  it('throws EntityStoreAccessError when Elasticsearch denies the lookup with 403', async () => {
    listEntities.mockRejectedValue(
      Object.assign(new Error('security_exception: unauthorized'), { statusCode: 403 })
    );

    await expect(
      checkEntityExists({ crudClient, esClient, entityId: 'host:abc123', entityType: 'host' })
    ).rejects.toThrow(EntityStoreAccessError);
  });

  it('rethrows other errors unchanged', async () => {
    const error = new Error('index_not_found_exception');
    listEntities.mockRejectedValue(error);

    await expect(
      checkEntityExists({ crudClient, esClient, entityId: 'host:abc123', entityType: 'host' })
    ).rejects.toThrow(error);
  });
});

describe('checkEntitiesExist', () => {
  const listEntities = jest.fn();
  const latestIndexName = jest.fn();
  const hasPrivileges = jest.fn();
  const crudClient = { listEntities, latestIndexName } as unknown as EntityStoreCRUDClient;
  const esClient = {
    security: { hasPrivileges },
  } as unknown as ElasticsearchClient;

  beforeEach(() => {
    listEntities.mockReset();
    latestIndexName.mockReset();
    hasPrivileges.mockReset();
    latestIndexName.mockResolvedValue('.entities.v2.latest.default-00001');
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
  });

  it('looks up every id in one query sized to the request', async () => {
    listEntities.mockResolvedValue({ entities: [] });

    await checkEntitiesExist({
      crudClient,
      esClient,
      entityIds: ['host:a', 'host:b'],
      entityType: 'host',
    });

    expect(listEntities).toHaveBeenCalledWith({
      filter: [
        { terms: { 'entity.id': ['host:a', 'host:b'] } },
        { term: { 'entity.EngineMetadata.Type': 'host' } },
      ],
      size: 2,
    });
  });

  it('returns the found records in request order and omits ids without a record', async () => {
    const a = { entity: { id: 'host:a' } };
    const c = { entity: { id: 'host:c' } };
    listEntities.mockResolvedValue({ entities: [c, a] });

    const result = await checkEntitiesExist({
      crudClient,
      esClient,
      entityIds: ['host:a', 'host:missing', 'host:c'],
      entityType: 'host',
    });

    expect(result).toEqual([a, c]);
  });

  it('throws EntityStoreAccessError when user lacks read privilege on the index', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: false });

    await expect(
      checkEntitiesExist({ crudClient, esClient, entityIds: ['host:a'], entityType: 'host' })
    ).rejects.toThrow(EntityStoreAccessError);
    expect(listEntities).not.toHaveBeenCalled();
  });
});
