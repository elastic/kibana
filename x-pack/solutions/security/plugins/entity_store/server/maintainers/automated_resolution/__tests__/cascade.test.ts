/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { cascadeLink } from '../cascade';

const INDEX = '.entities.v2.latest.security_default';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

const makeSearchByResolvedToResponse = (
  hits: Array<{ entityId: string; resolvedTo: string; _id: string }>
) => ({
  hits: {
    total: { value: hits.length, relation: 'eq' },
    hits: hits.map((h) => ({
      _id: h._id,
      _source: {
        entity: { id: h.entityId, relationships: { resolution: { resolved_to: h.resolvedTo } } },
        [RESOLVED_TO_FIELD]: h.resolvedTo,
      },
    })),
  },
});

const makeSearchEntitiesByIdsResponse = (
  hits: Array<{ entityId: string; resolvedTo?: string; _id: string }>
) => ({
  hits: {
    total: { value: hits.length, relation: 'eq' },
    hits: hits.map((h) => ({
      _id: h._id,
      _source: {
        entity: {
          id: h.entityId,
          ...(h.resolvedTo ? { relationships: { resolution: { resolved_to: h.resolvedTo } } } : {}),
        },
        ...(h.resolvedTo ? { [RESOLVED_TO_FIELD]: h.resolvedTo } : {}),
      },
    })),
  },
});

describe('cascadeLink', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = {
      search: jest.fn(),
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  it('should return early when aliasIds is empty', async () => {
    const result = await cascadeLink(mockEsClient, INDEX, 'target-Z', [], logger);

    expect(result).toEqual({ resolutionsCreated: 0, cascadeCount: 0, cycleBlocked: false });
    expect(mockEsClient.search).not.toHaveBeenCalled();
    expect(mockEsClient.bulk).not.toHaveBeenCalled();
  });

  it('should link a single alias with no cascade candidates', async () => {
    // searchByResolvedToField: no entities point to 'alias-Y'
    mockEsClient.search
      .mockResolvedValueOnce(makeSearchByResolvedToResponse([]) as any) // cascade candidates
      .mockResolvedValueOnce(
        makeSearchEntitiesByIdsResponse([{ entityId: 'alias-Y', _id: 'doc-Y' }]) as any
      ); // fetch alias _ids

    const result = await cascadeLink(mockEsClient, INDEX, 'target-Z', ['alias-Y'], logger);

    expect(result.resolutionsCreated).toBe(1);
    expect(result.cascadeCount).toBe(0);
    expect(result.cycleBlocked).toBe(false);
    expect(mockEsClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({ update: expect.objectContaining({ _id: 'doc-Y' }) }),
        ]),
      })
    );
  });

  it('should cascade-retarget incoming aliases (one-hop)', async () => {
    // alias-Y currently has A and B pointing to it
    mockEsClient.search
      .mockResolvedValueOnce(
        makeSearchByResolvedToResponse([
          { entityId: 'alias-A', resolvedTo: 'alias-Y', _id: 'doc-A' },
          { entityId: 'alias-B', resolvedTo: 'alias-Y', _id: 'doc-B' },
        ]) as any
      ) // cascade candidates
      .mockResolvedValueOnce(
        makeSearchEntitiesByIdsResponse([{ entityId: 'alias-Y', _id: 'doc-Y' }]) as any
      ); // fetch alias _ids

    const result = await cascadeLink(mockEsClient, INDEX, 'target-Z', ['alias-Y'], logger);

    expect(result.resolutionsCreated).toBe(1); // alias-Y direct
    expect(result.cascadeCount).toBe(2); // A and B cascaded
    expect(result.cycleBlocked).toBe(false);

    // All three (Y, A, B) should be in the bulk update
    const bulkCall = mockEsClient.bulk.mock.calls[0][0] as any;
    const docIds = bulkCall.operations
      .filter((op: any) => op.update)
      .map((op: any) => op.update._id);
    expect(docIds).toContain('doc-Y');
    expect(docIds).toContain('doc-A');
    expect(docIds).toContain('doc-B');
  });

  it('should detect cycles and return cycleBlocked=true', async () => {
    // target-Z is in the alias list (self-loop)
    mockEsClient.search
      .mockResolvedValueOnce(makeSearchByResolvedToResponse([]) as any)
      .mockResolvedValueOnce(
        makeSearchEntitiesByIdsResponse([{ entityId: 'target-Z', _id: 'doc-Z' }]) as any
      );

    const result = await cascadeLink(mockEsClient, INDEX, 'target-Z', ['target-Z'], logger);

    expect(result.cycleBlocked).toBe(true);
    expect(mockEsClient.bulk).not.toHaveBeenCalled();
  });

  it('should skip idempotent writes (alias already points to target)', async () => {
    mockEsClient.search
      .mockResolvedValueOnce(makeSearchByResolvedToResponse([]) as any)
      .mockResolvedValueOnce(
        makeSearchEntitiesByIdsResponse([
          // alias-Y already resolved to target-Z
          { entityId: 'alias-Y', resolvedTo: 'target-Z', _id: 'doc-Y' },
        ]) as any
      );

    const result = await cascadeLink(mockEsClient, INDEX, 'target-Z', ['alias-Y'], logger);

    expect(result.resolutionsCreated).toBe(0);
    expect(mockEsClient.bulk).not.toHaveBeenCalled();
  });

  it('should enforce depth limit and skip the write', async () => {
    // Simulate 51 cascade candidates (> MAX_CASCADE_DEPTH=50 total)
    const cascadedEntities = Array.from({ length: 50 }, (_, i) => ({
      entityId: `alias-${i}`,
      resolvedTo: 'alias-Y',
      _id: `doc-${i}`,
    }));

    mockEsClient.search
      .mockResolvedValueOnce(makeSearchByResolvedToResponse(cascadedEntities) as any)
      .mockResolvedValueOnce(
        makeSearchEntitiesByIdsResponse([{ entityId: 'alias-Y', _id: 'doc-Y' }]) as any
      );

    // Total = 1 (direct) + 50 (cascade) = 51 > 50 limit
    const result = await cascadeLink(mockEsClient, INDEX, 'target-Z', ['alias-Y'], logger);

    expect(result.resolutionsCreated).toBe(0);
    expect(result.cycleBlocked).toBe(false);
    expect(mockEsClient.bulk).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('depth limit exceeded'));
  });
});
