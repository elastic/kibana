/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationsDataClient } from '../siem_migrations_data_client';
import type { SiemMigrationsDataMigrationClient } from '../siem_migrations_data_migration_client';
import type { SiemMigrationsDataResourcesClient } from '../siem_migrations_data_resources_client';
import type { SiemMigrationsDataItemClient } from '../siem_migrations_data_item_client';

export const mockSiemMigrationsDataItemClient = {
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  searchBatches: jest.fn().mockReturnValue({
    next: jest.fn().mockResolvedValue([]),
    all: jest.fn().mockResolvedValue([]),
  }),
  saveProcessing: jest.fn().mockResolvedValue(undefined),
  saveCompleted: jest.fn().mockResolvedValue(undefined),
  saveError: jest.fn().mockResolvedValue(undefined),
  releaseProcessing: jest.fn().mockResolvedValue(undefined),
  updateStatus: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue(undefined),
  getAllStats: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<SiemMigrationsDataItemClient>;
export const MockSiemMigrationsDataItemClient = jest
  .fn()
  .mockImplementation(() => mockSiemMigrationsDataItemClient);

// Rule migrations data resources client
export const mockSiemMigrationsDataResourcesClient = {
  upsert: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
  searchBatches: jest.fn().mockReturnValue({
    next: jest.fn().mockResolvedValue([]),
    all: jest.fn().mockResolvedValue([]),
  }),
} as unknown as jest.Mocked<SiemMigrationsDataResourcesClient>;
export const MockSiemMigrationsDataResourcesClient = jest
  .fn()
  .mockImplementation(() => mockSiemMigrationsDataResourcesClient);

export const mockSiemMigrationsDataMigrationClient = {
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
  getAll: jest.fn().mockResolvedValue([]),
  saveAsStarted: jest.fn().mockResolvedValue(undefined),
  saveAsFinished: jest.fn().mockResolvedValue(undefined),
  saveAsFailed: jest.fn().mockResolvedValue(undefined),
  setIsStopped: jest.fn().mockResolvedValue(undefined),
  updateLastExecution: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<SiemMigrationsDataMigrationClient>;

export const MockSiemMigrationsDataMigrationClient = jest
  .fn()
  .mockImplementation(() => mockSiemMigrationsDataMigrationClient);

export const mockDeleteMigration = jest.fn().mockResolvedValue(undefined);

// Rule migrations data client
export const createSiemMigrationsDataClientMock = () =>
  ({
    items: mockSiemMigrationsDataItemClient,
    resources: mockSiemMigrationsDataResourcesClient,
    migrations: mockSiemMigrationsDataMigrationClient,
    deleteMigration: mockDeleteMigration,
  } as unknown as jest.MockedObjectDeep<SiemMigrationsDataClient>);

export const MockSiemMigrationsDataClient = jest
  .fn()
  .mockImplementation(() => createSiemMigrationsDataClientMock());

// Rule migrations data service
export const mockIndexName = 'mocked_siem_siem_migrations_index_name';
export const mockInstall = jest.fn().mockResolvedValue(undefined);
export const mockCreateClient = jest.fn(() => createSiemMigrationsDataClientMock());
export const mockSetup = jest.fn().mockResolvedValue(undefined);

export const MockSiemMigrationsDataService = jest.fn().mockImplementation(() => ({
  createAdapter: jest.fn(),
  install: mockInstall,
  createClient: mockCreateClient,
  createIndexNameProvider: jest.fn().mockResolvedValue(mockIndexName),
  setup: mockSetup,
}));
