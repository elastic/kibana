/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  getResolutionTargetEntityId,
  resolveResolutionTargetEntityId,
} from './resolution_target_ids';

describe('resolution_target_ids', () => {
  describe('getResolutionTargetEntityId', () => {
    it('reads nested entity.id', () => {
      expect(
        getResolutionTargetEntityId({
          entity: { id: 'user:canonical', name: 'canonical' },
        })
      ).toBe('user:canonical');
    });

    it('reads flat entity.id', () => {
      expect(getResolutionTargetEntityId({ 'entity.id': 'host:web-01' })).toBe('host:web-01');
    });

    it('returns undefined when missing', () => {
      expect(getResolutionTargetEntityId({ entity: { name: 'only-name' } })).toBeUndefined();
    });
  });

  describe('resolveResolutionTargetEntityId', () => {
    const logger = { debug: jest.fn() } as unknown as Logger;
    const esClient = {} as ElasticsearchClient;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns the target entity.id from the resolution group', async () => {
      const createResolutionClient = jest.fn().mockReturnValue({
        getResolutionGroup: jest.fn().mockResolvedValue({
          target: { entity: { id: 'user:canonical' } },
        }),
      });

      await expect(
        resolveResolutionTargetEntityId({
          entityStoreId: 'user:alias',
          spaceId: 'default',
          esClient,
          createResolutionClient,
          logger,
        })
      ).resolves.toBe('user:canonical');
    });

    it('falls back to the member id when createResolutionClient is missing', async () => {
      await expect(
        resolveResolutionTargetEntityId({
          entityStoreId: 'user:alias',
          spaceId: 'default',
          esClient,
          logger,
        })
      ).resolves.toBe('user:alias');
    });

    it('falls back to the member id when the lookup throws', async () => {
      const createResolutionClient = jest.fn().mockReturnValue({
        getResolutionGroup: jest.fn().mockRejectedValue(new Error('not found')),
      });

      await expect(
        resolveResolutionTargetEntityId({
          entityStoreId: 'user:alias',
          spaceId: 'default',
          esClient,
          createResolutionClient,
          logger,
        })
      ).resolves.toBe('user:alias');
      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
