/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { MonitorConfigRepository } from './monitor_config_repository';
import { syntheticsMonitorType } from '../../common/types/saved_objects';
import { ConfigKey, SyntheticsMonitor } from '../../common/runtime_types';
import * as utils from '../synthetics_service/utils';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

// Mock the utils functions
jest.mock('../synthetics_service/utils', () => ({
  formatSecrets: jest.fn((data) => ({ ...data, formattedSecrets: true })),
  normalizeSecrets: jest.fn((data) => ({ ...data, normalizedSecrets: true })),
}));

// Mock the AMP span
jest.mock('@kbn/apm-data-access-plugin/server/utils/with_apm_span', () => ({
  withApmSpan: jest.fn((spanName, fn) => fn()),
}));

describe('MonitorConfigRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let encryptedSavedObjectsClient: jest.Mocked<EncryptedSavedObjectsClient>;
  let repository: MonitorConfigRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    encryptedSavedObjectsClient = encryptedSavedObjectsMock
      .createStart()
      .getClient() as jest.Mocked<EncryptedSavedObjectsClient>;
    repository = new MonitorConfigRepository(soClient, encryptedSavedObjectsClient);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get a monitor by id', async () => {
      const id = 'test-id';
      const mockMonitor = {
        id,
        attributes: { name: 'Test Monitor' },
        type: syntheticsMonitorType,
        references: [],
      };

      soClient.get.mockResolvedValue(mockMonitor);

      const result = await repository.get(id);

      expect(soClient.get).toHaveBeenCalledWith(syntheticsMonitorType, id);
      expect(result).toBe(mockMonitor);
    });

    it('should propagate errors', async () => {
      const id = 'test-id';
      const error = new Error('Not found');

      soClient.get.mockRejectedValue(error);

      await expect(repository.get(id)).rejects.toThrow(error);
    });
  });

  describe('getDecrypted', () => {
    it('should get and decrypt a monitor by id and space', async () => {
      const id = 'test-id';
      const spaceId = 'test-space';
      const mockDecryptedMonitor = {
        id,
        attributes: { name: 'Test Monitor', secrets: 'decrypted' },
        type: syntheticsMonitorType,
        references: [],
      };

      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(
        mockDecryptedMonitor
      );
      (utils.normalizeSecrets as jest.Mock).mockReturnValue({
        ...mockDecryptedMonitor,
        normalizedSecrets: true,
      });

      const result = await repository.getDecrypted(id, spaceId);

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        syntheticsMonitorType,
        id,
        { namespace: spaceId }
      );
      expect(utils.normalizeSecrets).toHaveBeenCalledWith(mockDecryptedMonitor);
      expect(result).toEqual({ ...mockDecryptedMonitor, normalizedSecrets: true });
    });
  });

  describe('create', () => {
    it('should create a monitor with an id', async () => {
      const id = 'test-id';
      const savedObjectsClient = savedObjectsClientMock.create();
      const normalizedMonitor = {
        name: 'Test Monitor',
        [ConfigKey.CUSTOM_HEARTBEAT_ID]: 'custom-id',
      } as unknown as SyntheticsMonitor;

      const mockCreatedMonitor = {
        id,
        attributes: { name: 'Test Monitor' },
        type: syntheticsMonitorType,
        references: [],
      };
      savedObjectsClient.create.mockResolvedValue(mockCreatedMonitor);

      const result = await repository.create({
        id,
        savedObjectsClient,
        normalizedMonitor,
      });

      expect(utils.formatSecrets).toHaveBeenCalledWith({
        ...normalizedMonitor,
        [ConfigKey.MONITOR_QUERY_ID]: 'custom-id',
        [ConfigKey.CONFIG_ID]: id,
        revision: 1,
      });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        syntheticsMonitorType,
        {
          ...normalizedMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: 'custom-id',
          [ConfigKey.CONFIG_ID]: id,
          revision: 1,
          formattedSecrets: true,
        },
        { id, overwrite: true }
      );

      expect(result).toBe(mockCreatedMonitor);
    });

    it('should create a monitor without an id', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const normalizedMonitor = {
        name: 'Test Monitor',
      } as unknown as SyntheticsMonitor;

      const mockCreatedMonitor = {
        id: 'generated-id',
        attributes: { name: 'Test Monitor' },
        type: syntheticsMonitorType,
        references: [],
      };
      savedObjectsClient.create.mockResolvedValue(mockCreatedMonitor);

      const result = await repository.create({
        id: '',
        savedObjectsClient,
        normalizedMonitor,
      });

      expect(utils.formatSecrets).toHaveBeenCalledWith({
        ...normalizedMonitor,
        [ConfigKey.MONITOR_QUERY_ID]: '',
        [ConfigKey.CONFIG_ID]: '',
        revision: 1,
      });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        syntheticsMonitorType,
        {
          ...normalizedMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: '',
          [ConfigKey.CONFIG_ID]: '',
          revision: 1,
          formattedSecrets: true,
        },
        undefined
      );

      expect(result).toBe(mockCreatedMonitor);
    });
  });

  describe('createBulk', () => {
    it('should create multiple monitors in bulk', async () => {
      const monitors = [
        {
          id: 'test-id-1',
          monitor: {
            name: 'Test Monitor 1',
            [ConfigKey.CUSTOM_HEARTBEAT_ID]: 'custom-id-1',
          },
        },
        {
          id: 'test-id-2',
          monitor: {
            name: 'Test Monitor 2',
          },
        },
      ] as any;

      const mockBulkCreateResult = {
        saved_objects: [
          {
            id: 'test-id-1',
            attributes: { name: 'Test Monitor 1' },
            type: syntheticsMonitorType,
            references: [],
          },
          {
            id: 'test-id-2',
            attributes: { name: 'Test Monitor 2' },
            type: syntheticsMonitorType,
            references: [],
          },
        ],
      };

      soClient.bulkCreate.mockResolvedValue(mockBulkCreateResult);

      const result = await repository.createBulk({ monitors });

      expect(soClient.bulkCreate).toHaveBeenCalledWith([
        {
          id: 'test-id-1',
          type: syntheticsMonitorType,
          attributes: {
            name: 'Test Monitor 1',
            [ConfigKey.CUSTOM_HEARTBEAT_ID]: 'custom-id-1',
            [ConfigKey.MONITOR_QUERY_ID]: 'custom-id-1',
            [ConfigKey.CONFIG_ID]: 'test-id-1',
            revision: 1,
            formattedSecrets: true,
          },
        },
        {
          id: 'test-id-2',
          type: syntheticsMonitorType,
          attributes: {
            name: 'Test Monitor 2',
            [ConfigKey.MONITOR_QUERY_ID]: 'test-id-2',
            [ConfigKey.CONFIG_ID]: 'test-id-2',
            revision: 1,
            formattedSecrets: true,
          },
        },
      ]);

      expect(result).toBe(mockBulkCreateResult.saved_objects);
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple monitors in bulk', async () => {
      const monitors = [
        {
          id: 'test-id-1',
          attributes: {
            name: 'Updated Monitor 1',
          },
        },
        {
          id: 'test-id-2',
          attributes: {
            name: 'Updated Monitor 2',
          },
        },
      ] as any;

      const mockBulkUpdateResult = {
        saved_objects: [
          {
            id: 'test-id-1',
            attributes: { name: 'Updated Monitor 1' },
            type: syntheticsMonitorType,
            references: [],
          },
          {
            id: 'test-id-2',
            attributes: { name: 'Updated Monitor 2' },
            type: syntheticsMonitorType,
            references: [],
          },
        ],
      };

      soClient.bulkUpdate.mockResolvedValue(mockBulkUpdateResult);

      const result = await repository.bulkUpdate({ monitors });

      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: syntheticsMonitorType,
          id: 'test-id-1',
          attributes: { name: 'Updated Monitor 1' },
        },
        {
          type: syntheticsMonitorType,
          id: 'test-id-2',
          attributes: { name: 'Updated Monitor 2' },
        },
      ]);

      expect(result).toBe(mockBulkUpdateResult);
    });
  });

  describe('find', () => {
    it('should find monitors with options', async () => {
      const options = {
        search: 'test',
        page: 1,
        perPage: 10,
        sortField: 'name',
        sortOrder: 'asc' as const,
      };

      const mockFindResult = {
        saved_objects: [
          {
            id: 'test-id-1',
            attributes: { name: 'Test Monitor 1' },
            type: syntheticsMonitorType,
            references: [],
          },
          {
            id: 'test-id-2',
            attributes: { name: 'Test Monitor 2' },
            type: syntheticsMonitorType,
            references: [],
          },
        ],
        total: 2,
        per_page: 10,
        page: 1,
      } as any;

      soClient.find.mockResolvedValue(mockFindResult);

      const result = await repository.find(options);

      expect(soClient.find).toHaveBeenCalledWith({
        type: syntheticsMonitorType,
        ...options,
      });

      expect(result).toBe(mockFindResult);
    });

    it('should use default perPage if not provided', async () => {
      const options = {
        search: 'test',
      };

      const mockFindResult = {
        saved_objects: [],
        total: 0,
        per_page: 5000,
        page: 1,
      };

      soClient.find.mockResolvedValue(mockFindResult);

      await repository.find(options);

      expect(soClient.find).toHaveBeenCalledWith({
        type: syntheticsMonitorType,
        search: 'test',
        perPage: 5000,
      });
    });
  });

  describe('findDecryptedMonitors', () => {
    it('should find decrypted monitors by space id and filter', async () => {
      const spaceId = 'test-space';
      const filter = 'attributes.name:test';

      const mockDecryptedMonitors = [
        {
          id: 'test-id-1',
          attributes: { name: 'Test Monitor 1', secrets: 'decrypted' },
          type: syntheticsMonitorType,
          references: [],
        },
        {
          id: 'test-id-2',
          attributes: { name: 'Test Monitor 2', secrets: 'decrypted' },
          type: syntheticsMonitorType,
          references: [],
        },
      ];

      const pointInTimeFinderMock = {
        find: jest.fn().mockImplementation(function* () {
          yield { saved_objects: mockDecryptedMonitors };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      } as any;

      encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser.mockReturnValue(
        pointInTimeFinderMock
      );

      const result = await repository.findDecryptedMonitors({ spaceId, filter });

      expect(
        encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith({
        filter,
        type: syntheticsMonitorType,
        perPage: 500,
        namespaces: [spaceId],
      });

      expect(pointInTimeFinderMock.find).toHaveBeenCalled();
      expect(pointInTimeFinderMock.close).toHaveBeenCalled();
      expect(result).toEqual(mockDecryptedMonitors);
    });

    it('should handle finder.close errors', async () => {
      const spaceId = 'test-space';

      const mockDecryptedMonitors = [
        {
          id: 'test-id-1',
          attributes: { name: 'Test Monitor 1', secrets: 'decrypted' },
          type: syntheticsMonitorType,
          references: [],
        },
      ];

      const pointInTimeFinderMock = {
        find: jest.fn().mockImplementation(function* () {
          yield { saved_objects: mockDecryptedMonitors };
        }),
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      } as any;

      encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser.mockReturnValue(
        pointInTimeFinderMock
      );

      const result = await repository.findDecryptedMonitors({ spaceId });

      expect(pointInTimeFinderMock.close).toHaveBeenCalled();
      expect(result).toEqual(mockDecryptedMonitors);
      // Should not throw an error when close fails
    });
  });

  describe('delete', () => {
    it('should delete a monitor by id', async () => {
      const id = 'test-id';
      const mockDeleteResult = { success: true };

      soClient.delete.mockResolvedValue(mockDeleteResult);

      const result = await repository.delete(id);

      expect(soClient.delete).toHaveBeenCalledWith(syntheticsMonitorType, id);
      expect(result).toBe(mockDeleteResult);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple monitors by ids', async () => {
      const ids = ['test-id-1', 'test-id-2'];
      const mockBulkDeleteResult = { success: true } as any;

      soClient.bulkDelete.mockResolvedValue(mockBulkDeleteResult);

      const result = await repository.bulkDelete(ids);

      expect(soClient.bulkDelete).toHaveBeenCalledWith([
        { type: syntheticsMonitorType, id: 'test-id-1' },
        { type: syntheticsMonitorType, id: 'test-id-2' },
      ]);

      expect(result).toBe(mockBulkDeleteResult);
    });
  });

  describe('getAll', () => {
    it('should get all monitors with options', async () => {
      const options = {
        search: 'test',
        fields: ['name'],
        filter: 'attributes.enabled:true',
        sortField: 'name.keyword',
        sortOrder: 'asc' as const,
        searchFields: ['name'],
        showFromAllSpaces: true,
      };

      const mockMonitors = [
        { id: 'test-id-1', attributes: { name: 'Test Monitor 1' } },
        { id: 'test-id-2', attributes: { name: 'Test Monitor 2' } },
      ];

      const pointInTimeFinderMock = {
        find: jest.fn().mockImplementation(function* () {
          yield { saved_objects: mockMonitors };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      soClient.createPointInTimeFinder.mockReturnValue(pointInTimeFinderMock);

      const result = await repository.getAll(options);

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: syntheticsMonitorType,
        perPage: 5000,
        search: 'test',
        fields: ['name'],
        filter: 'attributes.enabled:true',
        sortField: 'name.keyword',
        sortOrder: 'asc',
        searchFields: ['name'],
        namespaces: ['*'],
      });

      expect(result).toEqual(mockMonitors);
    });

    it('should not include namespaces if showFromAllSpaces is false', async () => {
      const options = {
        search: 'test',
        showFromAllSpaces: false,
      };

      const mockMonitors: any = [];

      const pointInTimeFinderMock = {
        find: jest.fn().mockImplementation(function* () {
          yield { saved_objects: mockMonitors };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      soClient.createPointInTimeFinder.mockReturnValue(pointInTimeFinderMock);

      await repository.getAll(options);

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: syntheticsMonitorType,
        perPage: 5000,
        search: 'test',
        sortField: 'name.keyword',
        sortOrder: 'asc',
      });
    });

    it('should use default sort options if not provided', async () => {
      const options = {
        search: 'test',
      };

      const mockMonitors: any = [];

      const pointInTimeFinderMock = {
        find: jest.fn().mockImplementation(function* () {
          yield { saved_objects: mockMonitors };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      soClient.createPointInTimeFinder.mockReturnValue(pointInTimeFinderMock);

      await repository.getAll(options);

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: syntheticsMonitorType,
        perPage: 5000,
        search: 'test',
        sortField: 'name.keyword',
        sortOrder: 'asc',
      });
    });

    it('should handle finder.close errors', async () => {
      const options = { search: 'test' };

      const mockMonitors = [{ id: 'test-id-1', attributes: { name: 'Test Monitor 1' } }];

      const pointInTimeFinderMock = {
        find: jest.fn().mockImplementation(function* () {
          yield { saved_objects: mockMonitors };
        }),
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      };

      soClient.createPointInTimeFinder.mockReturnValue(pointInTimeFinderMock);

      const result = await repository.getAll(options);

      expect(pointInTimeFinderMock.close).toHaveBeenCalled();
      expect(result).toEqual(mockMonitors);
      // Should not throw an error when close fails
    });
  });
});
