/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { transformEntityTypeToIconAndShape, checkIfEntitiesIndexLookupMode } from './utils';

describe('utils', () => {
  describe('transformEntityTypeToIconAndShape', () => {
    it('should return empty object for undefined input', () => {
      expect(transformEntityTypeToIconAndShape(undefined as unknown as string)).toEqual({});
    });

    it('should return empty object for null input', () => {
      expect(transformEntityTypeToIconAndShape(null as unknown as string)).toEqual({});
    });

    // Unknown or non-existent entity types
    it('should return undefined icon and shape for entity types that do not match any mappings', () => {
      ['NonExistentType', 'Unknown', '123456', 'CustomEntityType'].forEach((type) => {
        expect(transformEntityTypeToIconAndShape(type)).toEqual({
          icon: undefined,
          shape: undefined,
        });
      });
    });

    it('should correctly map user-related entity types to the user icon and ellipse shape', () => {
      const userTypes = [
        'User',
        'user',
        'SERVICE ACCOUNT',
        'Identity',
        'Group',
        'Secret',
        'Secret Vault',
        'Access Management',
      ];

      userTypes.forEach((entityType) => {
        expect(transformEntityTypeToIconAndShape(entityType)).toEqual({
          icon: 'user',
          shape: 'ellipse',
        });
      });
    });

    it('should correctly map database-related entity types to the database icon and rectangle shape', () => {
      const databaseTypes = [
        'Database',
        'database',
        'AI Model',
        'STORAGE BUCKET',
        'Volume',
        'Config Map',
        'Managed Certificate',
        'Storage',
      ];

      databaseTypes.forEach((entityType) => {
        expect(transformEntityTypeToIconAndShape(entityType)).toEqual({
          icon: 'database',
          shape: 'rectangle',
        });
      });
    });

    it('should correctly map host-related entity types to the host icon and rectangle shape', () => {
      const hostTypes = ['Host', 'Virtual Desktop', 'Virtual Workstation', 'Virtual Machine Image'];

      hostTypes.forEach((entityType) => {
        expect(transformEntityTypeToIconAndShape(entityType)).toEqual({
          icon: 'storage',
          shape: 'hexagon',
        });
      });
    });
  });

  describe('checkIfEntitiesIndexLookupMode', () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient();
    let logger: Logger;

    beforeEach(() => {
      logger = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      } as unknown as Logger;
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should return true when index exists and is in lookup mode', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: { index: { mode: 'lookup' } },
          },
        });

      const result = await checkIfEntitiesIndexLookupMode(esClient, logger, 'default');
      expect(result).toBe(true);
    });

    it('should return false when index exists but is not in lookup mode', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: { index: { mode: 'standard' } },
          },
        });

      const result = await checkIfEntitiesIndexLookupMode(esClient, logger, 'default');
      expect(result).toBe(false);
    });

    it('should return false when index settings are not found', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: undefined,
        });

      const result = await checkIfEntitiesIndexLookupMode(esClient, logger, 'default');
      expect(result).toBe(false);
    });

    it('should return false when index does not exist (404)', async () => {
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 404 });

      const result = await checkIfEntitiesIndexLookupMode(esClient, logger, 'default');
      expect(result).toBe(false);
    });

    it('should return false and log error on unexpected errors', async () => {
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 500, message: 'Internal error' });

      const result = await checkIfEntitiesIndexLookupMode(esClient, logger, 'default');
      expect(result).toBe(false);
    });

    it('should use correct index name for the given spaceId', async () => {
      const spaceId = 'custom-space';
      const indexName = getEntitiesLatestIndexName(spaceId);

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: { index: { mode: 'lookup' } },
          },
        });

      await checkIfEntitiesIndexLookupMode(esClient, logger, spaceId);

      expect(esClient.asInternalUser.indices.getSettings).toHaveBeenCalledWith({
        index: indexName,
      });
    });
  });
});
