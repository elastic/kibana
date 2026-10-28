/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { checkEntityExists, EntityStoreAccessError, getEntityRecords } from './check_entity_exists';
import {
  RESOLUTION_GROUP_RISK_SORT_FIELD,
  RESOLVED_MODE_MAX_RECORDS,
  RESOLVED_TO_FIELD,
} from '../../../../common/entity_analytics/entity_store/resolution_group';

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
          { term: { 'entity.id': 'user:jane@okta' } },
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

describe('getEntityRecords', () => {
  const listEntities = jest.fn();
  const latestIndexName = jest.fn();
  const hasPrivileges = jest.fn();
  const crudClient = { listEntities, latestIndexName } as unknown as EntityStoreCRUDClient;
  const esClient = {
    security: { hasPrivileges },
  } as unknown as ElasticsearchClient;

  const target = { entity: { id: 'host:target' } };
  const aliasA = { entity: { id: 'host:a' } };
  const aliasB = { entity: { id: 'host:b' } };

  beforeEach(() => {
    listEntities.mockReset();
    latestIndexName.mockReset();
    hasPrivileges.mockReset();
    latestIndexName.mockResolvedValue('.entities.v2.latest.default-00001');
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
  });

  describe('single mode', () => {
    it('looks up the target record only and defaults to single mode', async () => {
      listEntities.mockResolvedValue({ entities: [target] });

      const result = await getEntityRecords({
        crudClient,
        esClient,
        entityId: 'host:target',
        entityType: 'host',
      });

      expect(result).toEqual([target]);
      expect(listEntities).toHaveBeenCalledWith({
        filter: [
          { term: { 'entity.id': 'host:target' } },
          { term: { 'entity.EngineMetadata.Type': 'host' } },
        ],
        size: 1,
      });
    });

    it('returns an empty list when the target is missing', async () => {
      listEntities.mockResolvedValue({ entities: [] });

      const result = await getEntityRecords({
        crudClient,
        esClient,
        entityId: 'host:missing',
        entityType: 'host',
        mode: 'single',
      });

      expect(result).toEqual([]);
    });
  });

  describe('resolved mode', () => {
    const mockTargetAndGroup = (targetResult: unknown[], groupResult: unknown[]) => {
      listEntities.mockImplementation(async ({ size }: { size: number }) => ({
        entities: size === 1 ? targetResult : groupResult,
      }));
    };

    it('runs a target lookup followed by a riskiest-first aliases query capped to the group size', async () => {
      mockTargetAndGroup([target], [target]);

      await getEntityRecords({
        crudClient,
        esClient,
        entityId: 'host:target',
        entityType: 'host',
        mode: 'resolved',
      });

      expect(listEntities).toHaveBeenCalledTimes(2);
      expect(listEntities).toHaveBeenCalledWith({
        filter: [
          { term: { 'entity.id': 'host:target' } },
          { term: { 'entity.EngineMetadata.Type': 'host' } },
        ],
        size: 1,
      });
      expect(listEntities).toHaveBeenCalledWith({
        filter: [
          { term: { [RESOLVED_TO_FIELD]: 'host:target' } },
          { term: { 'entity.EngineMetadata.Type': 'host' } },
        ],
        size: RESOLVED_MODE_MAX_RECORDS - 1,
        sort: [{ [RESOLUTION_GROUP_RISK_SORT_FIELD]: 'desc' }],
      });
    });

    it('returns the target first followed by its aliases in the order they were returned', async () => {
      mockTargetAndGroup([target], [aliasA, aliasB]);

      const result = await getEntityRecords({
        crudClient,
        esClient,
        entityId: 'host:target',
        entityType: 'host',
        mode: 'resolved',
      });

      expect(result).toEqual([target, aliasA, aliasB]);
    });

    it('never lists the target twice if the aliases query returns it', async () => {
      mockTargetAndGroup([target], [aliasA, target]);

      const result = await getEntityRecords({
        crudClient,
        esClient,
        entityId: 'host:target',
        entityType: 'host',
        mode: 'resolved',
      });

      expect(result).toEqual([target, aliasA]);
    });

    it('returns an empty list when only aliases match but the target is missing', async () => {
      mockTargetAndGroup([], [aliasA, aliasB]);

      const result = await getEntityRecords({
        crudClient,
        esClient,
        entityId: 'host:target',
        entityType: 'host',
        mode: 'resolved',
      });

      expect(result).toEqual([]);
      expect(listEntities).toHaveBeenCalledTimes(1);
    });

    it('throws EntityStoreAccessError when user lacks read privilege on the index', async () => {
      hasPrivileges.mockResolvedValue({ has_all_requested: false });

      await expect(
        getEntityRecords({
          crudClient,
          esClient,
          entityId: 'host:target',
          entityType: 'host',
          mode: 'resolved',
        })
      ).rejects.toThrow(EntityStoreAccessError);
      expect(listEntities).not.toHaveBeenCalled();
    });
  });
});
