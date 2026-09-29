/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { updatePrivilegedMonitoringSourceIndex, MAX_PER_PAGE } from './update_source_index';
import { monitoringEntitySourceTypeName } from '../saved_objects/monitoring_entity_source_type';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';

const mockShouldRunSourceMigrationFactory = vi.fn();
vi.mock('../data_sources/migrations/check_if_entity_source_migration', () => {
      const mocked = {
      shouldRunSourceMigrationFactory: () => mockShouldRunSourceMigrationFactory(),
    };
      return { ...mocked, default: mocked };
    });

const mockMigrateSourceIndex = vi.fn();
vi.mock('../data_sources/migrations/source_index_update', () => {
      const mocked = {
      migrateSourceIndexFactory: () => mockMigrateSourceIndex,
    };
      return { ...mocked, default: mocked };
    });

const mockDeleteUsersWithSourceIndex = vi.fn();
vi.mock('../data_sources/migrations/delete_user_with_source_indices', () => {
      const mocked = {
      deleteUsersWithSourceIndexFactory: () => mockDeleteUsersWithSourceIndex,
    };
      return { ...mocked, default: mocked };
    });

const mockApiKeyManager = {
  getClient: vi.fn().mockResolvedValue({
    clusterClient: { asCurrentUser: {} },
  }),
};

vi.mock('../auth/api_key', () => {
      const mocked = {
      getApiKeyManager: () => mockApiKeyManager,
    };
      return { ...mocked, default: mocked };
    });

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
} as unknown as EntityAnalyticsMigrationsParams['logger'];

const mockGetStartServices = vi.fn();

const mockSoClient = {
  find: vi.fn().mockResolvedValue({ saved_objects: [] }),
};

const mockCore = {
  elasticsearch: {
    client: {
      asInternalUser: {},
    },
  },
  savedObjects: {
    createInternalRepository: vi.fn().mockReturnValue(mockSoClient),
  },
};
const mockSecurity = {};
const mockEncryptedSavedObjects = {};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updatePrivilegedMonitoringSourceIndex', () => {
  const DEFAULT_PARAMS = {
    logger: mockLogger,
    getStartServices: mockGetStartServices,
  } as unknown as EntityAnalyticsMigrationsParams;

  it('skips migration if shouldRunMigration returns false', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(vi.fn().mockResolvedValue(false));
    mockGetStartServices.mockResolvedValue([
      mockCore,
      { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
    ]);

    await updatePrivilegedMonitoringSourceIndex(DEFAULT_PARAMS);

    expect(mockSoClient.find).not.toHaveBeenCalled();
    expect(mockDeleteUsersWithSourceIndex).not.toHaveBeenCalled();
  });

  it('runs migration for each saved object and deletes users with source index', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(vi.fn().mockResolvedValue(true));
    mockGetStartServices.mockResolvedValue([
      mockCore,
      { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
    ]);
    const savedObjects = [
      {
        id: 'so-id-1',
        namespaces: ['default'],
        attributes: { indexPattern: 'pattern-1' },
      },
      {
        id: 'so-id-2',
        namespaces: ['space-2'],
        attributes: { indexPattern: 'pattern-2' },
      },
    ];
    mockSoClient.find.mockResolvedValue({ saved_objects: savedObjects });

    await updatePrivilegedMonitoringSourceIndex(DEFAULT_PARAMS);

    expect(mockSoClient.find).toHaveBeenCalledWith({
      type: monitoringEntitySourceTypeName,
      perPage: MAX_PER_PAGE,
      namespaces: ['*'],
    });
    expect(mockMigrateSourceIndex).toHaveBeenCalledTimes(2);
    expect(mockMigrateSourceIndex).toHaveBeenCalledWith('default', 'pattern-1', 'so-id-1');
    expect(mockMigrateSourceIndex).toHaveBeenCalledWith('space-2', 'pattern-2', 'so-id-2');
    expect(mockDeleteUsersWithSourceIndex).toHaveBeenCalledWith('*');
  });

  it('does not throw if there are no saved objects', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(vi.fn().mockResolvedValue(true));
    mockGetStartServices.mockResolvedValue([
      mockCore,
      { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
    ]);
    mockSoClient.find.mockResolvedValue({ saved_objects: [] });

    await updatePrivilegedMonitoringSourceIndex(DEFAULT_PARAMS);

    expect(mockMigrateSourceIndex).not.toHaveBeenCalled();
    expect(mockDeleteUsersWithSourceIndex).toHaveBeenCalledWith('*');
  });

  describe('with spaceId defined', () => {
    it('scopes the shouldRun check, SO query, and user deletion to the specified space', async () => {
      const mockShouldRunMigration = vi.fn().mockResolvedValue(true);
      mockShouldRunSourceMigrationFactory.mockReturnValue(mockShouldRunMigration);
      mockGetStartServices.mockResolvedValue([
        mockCore,
        { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
      ]);
      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          { id: 'so-id-1', namespaces: ['my-space'], attributes: { indexPattern: 'pattern-1' } },
        ],
      });

      await updatePrivilegedMonitoringSourceIndex({
        ...DEFAULT_PARAMS,
        spaceId: 'my-space',
      });

      expect(mockShouldRunMigration).toHaveBeenCalledWith('my-space');
      expect(mockSoClient.find).toHaveBeenCalledWith(
        expect.objectContaining({ namespaces: ['my-space'] })
      );
      expect(mockDeleteUsersWithSourceIndex).toHaveBeenCalledWith('my-space');
    });
  });

  it('logs error and skips if api key manager returns no client', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(vi.fn().mockResolvedValue(true));
    mockGetStartServices.mockResolvedValue([
      mockCore,
      { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
    ]);
    const savedObjects = [
      {
        id: 'so-id-1',
        namespaces: ['default'],
        attributes: { indexPattern: 'pattern-1' },
      },
    ];
    mockSoClient.find.mockResolvedValue({ saved_objects: savedObjects });
    mockApiKeyManager.getClient.mockResolvedValue(undefined);

    await updatePrivilegedMonitoringSourceIndex(DEFAULT_PARAMS);

    expect(mockMigrateSourceIndex).not.toHaveBeenCalled();
    expect(mockDeleteUsersWithSourceIndex).toHaveBeenCalledWith('*');
  });
});
