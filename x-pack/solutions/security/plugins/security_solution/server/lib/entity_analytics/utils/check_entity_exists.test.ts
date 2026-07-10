/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { checkEntityExists, EntityStoreAccessError } from './check_entity_exists';

describe('checkEntityExists', () => {
  const listEntities = jest.fn();
  const crudClient = { listEntities } as unknown as EntityStoreCRUDClient;

  beforeEach(() => {
    listEntities.mockReset();
  });

  it('returns true when a matching entity is found', async () => {
    listEntities.mockResolvedValue({ entities: [{ entity: { id: 'host:abc123' } }] });

    const exists = await checkEntityExists({
      crudClient,
      entityId: 'host:abc123',
      entityType: 'host',
    });

    expect(exists).toBe(true);
  });

  it('returns false when no matching entity is found', async () => {
    listEntities.mockResolvedValue({ entities: [] });

    const exists = await checkEntityExists({
      crudClient,
      entityId: 'host:does-not-exist',
      entityType: 'host',
    });

    expect(exists).toBe(false);
  });

  it('filters by both entity.id and entity.EngineMetadata.Type', async () => {
    listEntities.mockResolvedValue({ entities: [] });

    await checkEntityExists({ crudClient, entityId: 'user:jane@okta', entityType: 'user' });

    expect(listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: [
          { term: { 'entity.id': 'user:jane@okta' } },
          { term: { 'entity.EngineMetadata.Type': 'user' } },
        ],
      })
    );
  });

  it('throws EntityStoreAccessError when Elasticsearch denies the lookup', async () => {
    listEntities.mockRejectedValue(
      Object.assign(new Error('security_exception: unauthorized'), { statusCode: 403 })
    );

    await expect(
      checkEntityExists({ crudClient, entityId: 'host:abc123', entityType: 'host' })
    ).rejects.toThrow(EntityStoreAccessError);
  });

  it('rethrows other errors unchanged', async () => {
    const error = new Error('index_not_found_exception');
    listEntities.mockRejectedValue(error);

    await expect(
      checkEntityExists({ crudClient, entityId: 'host:abc123', entityType: 'host' })
    ).rejects.toThrow(error);
  });
});
