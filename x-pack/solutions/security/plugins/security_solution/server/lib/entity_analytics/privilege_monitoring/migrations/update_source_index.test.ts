/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updatePrivilegedMonitoringSourceIndex, MAX_PER_PAGE } from './update_source_index';
import { monitoringEntitySourceTypeName } from '../saved_objects/monitoring_entity_source_type';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';

const mockShouldRunSourceMigrationFactory = jest.fn();
jest.mock('../data_sources/migrations/check_if_entity_source_migration', () => ({
  shouldRunSourceMigrationFactory: () => mockShouldRunSourceMigrationFactory(),
}));

const mockMigrateSourceIndex = jest.fn();
jest.mock('../data_sources/migrations/source_index_update', () => ({
  migrateSourceIndexFactory: () => mockMigrateSourceIndex,
}));

const mockDeleteUsersWithSourceIndex = jest.fn();
jest.mock('../data_sources/migrations/delete_user_with_source_indices', () => ({
  deleteUsersWithSourceIndexFactory: () => mockDeleteUsersWithSourceIndex,
}));

const mockApiKeyManager = {
  getClient: jest.fn().mockResolvedValue({
    clusterClient: { asCurrentUser: {} },
  }),
};

jest.mock('../auth/api_key', () => ({
  getApiKeyManager: () => mockApiKeyManager,
}));

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
} as unknown as EntityAnalyticsMigrationsParams['logger'];

const mockGetStartServices = jest.fn();

const mockSoClient = {
  find: jest.fn().mockResolvedValue({ saved_objects: [] }),
};

const mockCore = {
  elasticsearch: {
    client: {
      asInternalUser: {},
    },
  },
  savedObjects: {
    createInternalRepository: jest.fn().mockReturnValue(mockSoClient),
  },
};
const mockSecurity = {};
const mockEncryptedSavedObjects = {};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('updatePrivilegedMonitoringSourceIndex', () => {
  const DEFAULT_PARAMS = {
    logger: mockLogger,
    getStartServices: mockGetStartServices,
  } as unknown as EntityAnalyticsMigrationsParams;

  it('skips migration if shouldRunMigration returns false', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(jest.fn().mockResolvedValue(false));
    mockGetStartServices.mockResolvedValue([
      mockCore,
      { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
    ]);

    await updatePrivilegedMonitoringSourceIndex(DEFAULT_PARAMS);

    expect(mockSoClient.find).not.toHaveBeenCalled();
    expect(mockDeleteUsersWithSourceIndex).not.toHaveBeenCalled();
  });

  it('runs migration for each saved object and deletes users with source index', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(jest.fn().mockResolvedValue(true));
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
    mockShouldRunSourceMigrationFactory.mockReturnValue(jest.fn().mockResolvedValue(true));
    mockGetStartServices.mockResolvedValue([
      mockCore,
      { security: mockSecurity, encryptedSavedObjects: mockEncryptedSavedObjects },
    ]);
    mockSoClient.find.mockResolvedValue({ saved_objects: [] });

    await updatePrivilegedMonitoringSourceIndex(DEFAULT_PARAMS);

    expect(mockMigrateSourceIndex).not.toHaveBeenCalled();
    expect(mockDeleteUsersWithSourceIndex).toHaveBeenCalledWith('*');
  });

  it('logs error and skips if api key manager returns no client', async () => {
    mockShouldRunSourceMigrationFactory.mockReturnValue(jest.fn().mockResolvedValue(true));
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
