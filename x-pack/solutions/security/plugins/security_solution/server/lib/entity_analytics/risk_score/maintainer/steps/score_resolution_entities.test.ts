/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { fetchResolutionGroupMemberIds } from './score_resolution_entities';
import type { ScopedLogger } from '../utils/with_log_context';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as ScopedLogger);

describe('score_resolution_entities', () => {
  it('returns an empty set when no resolution targets are provided', async () => {
    const crudClient = {
      listEntities: jest.fn(),
    } as unknown as EntityUpdateClient;
    const logger = buildLogger();

    const result = await fetchResolutionGroupMemberIds({
      crudClient,
      resolutionTargetIds: [],
      logger,
    });

    expect(result).toEqual(new Set());
    expect(crudClient.listEntities).not.toHaveBeenCalled();
  });

  it('returns an empty set and warns when entity-store query fails', async () => {
    const crudClient = {
      listEntities: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as EntityUpdateClient;
    const logger = buildLogger();

    const result = await fetchResolutionGroupMemberIds({
      crudClient,
      resolutionTargetIds: ['user:target-1'],
      logger,
    });

    expect(result).toEqual(new Set());
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('uses a fixed entity-store page size when fetching resolution group members', async () => {
    const crudClient = {
      listEntities: jest.fn().mockResolvedValue({
        entities: [],
        nextSearchAfter: undefined,
      }),
    } as unknown as EntityUpdateClient;
    const logger = buildLogger();

    await fetchResolutionGroupMemberIds({
      crudClient,
      resolutionTargetIds: ['user:target-1', 'user:target-2'],
      logger,
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith({
      filter: {
        terms: {
          'entity.relationships.resolution.resolved_to': ['user:target-1', 'user:target-2'],
        },
      },
      size: 1000,
      searchAfter: undefined,
      source: ['entity.id'],
    });
  });
});
