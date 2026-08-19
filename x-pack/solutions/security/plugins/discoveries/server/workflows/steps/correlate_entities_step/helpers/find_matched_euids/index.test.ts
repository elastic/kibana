/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';

import { findMatchedEuids } from '.';

describe('findMatchedEuids', () => {
  const mockLogger = {
    debug: jest.fn(),
  } as unknown as Logger;

  const mockListEntities = jest.fn();
  const mockCrudClient = {
    listEntities: mockListEntities,
  } as unknown as EntityStoreCRUDClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty set when the crud client is undefined (entity store unavailable)', async () => {
    const result = await findMatchedEuids({
      crudClient: undefined,
      euids: ['user:jdoe'],
      logger: mockLogger,
    });

    expect(result).toEqual(new Set());
  });

  it('returns an empty set without querying when there are no candidate EUIDs', async () => {
    const result = await findMatchedEuids({
      crudClient: mockCrudClient,
      euids: [],
      logger: mockLogger,
    });

    expect(result).toEqual(new Set());
    expect(mockListEntities).not.toHaveBeenCalled();
  });

  it('queries listEntities with a terms filter on entity.id', async () => {
    mockListEntities.mockResolvedValue({ entities: [] });

    await findMatchedEuids({
      crudClient: mockCrudClient,
      euids: ['user:jdoe', 'host:web-01'],
      logger: mockLogger,
    });

    expect(mockListEntities).toHaveBeenCalledWith({
      filter: { terms: { 'entity.id': ['user:jdoe', 'host:web-01'] } },
      size: 2,
      source: ['entity.id'],
    });
  });

  it('returns the set of EUIDs found in the store', async () => {
    mockListEntities.mockResolvedValue({
      entities: [{ entity: { id: 'user:jdoe' } }],
    });

    const result = await findMatchedEuids({
      crudClient: mockCrudClient,
      euids: ['user:jdoe', 'host:web-01'],
      logger: mockLogger,
    });

    expect(result).toEqual(new Set(['user:jdoe']));
  });

  it('ignores store records without an entity.id', async () => {
    mockListEntities.mockResolvedValue({
      entities: [{ entity: {} }, {}, { entity: { id: 'host:web-01' } }],
    });

    const result = await findMatchedEuids({
      crudClient: mockCrudClient,
      euids: ['user:jdoe', 'host:web-01'],
      logger: mockLogger,
    });

    expect(result).toEqual(new Set(['host:web-01']));
  });

  it('returns an empty set (best-effort) when the lookup throws', async () => {
    mockListEntities.mockRejectedValue(new Error('index_not_found_exception'));

    const result = await findMatchedEuids({
      crudClient: mockCrudClient,
      euids: ['user:jdoe'],
      logger: mockLogger,
    });

    expect(result).toEqual(new Set());
    expect(mockLogger.debug).toHaveBeenCalled();
  });
});
