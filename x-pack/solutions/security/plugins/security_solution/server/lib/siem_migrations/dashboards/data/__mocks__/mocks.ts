/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationsDataMigrationClient as DashboardMigrationsDataMigrationClient } from '../../../common/data/siem_migrations_data_migration_client';
import type { DashboardMigrationsDataDashboardsClient } from '../dashboard_migrations_data_dashboards_client';

export const mockDashboardMigrationDataMigrationClient = {
  create: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<DashboardMigrationsDataMigrationClient>;

export const MockDashboardMigrationDataMigrationClient = jest
  .fn()
  .mockImplementation(() => mockDashboardMigrationDataMigrationClient);

export const mockDashboardMigrationsDataDashboardsClient = {
  create: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<DashboardMigrationsDataDashboardsClient>;

export const MockDashboardMigrationsDataDashboardsClient = jest
  .fn()
  .mockImplementation(() => mockDashboardMigrationsDataDashboardsClient);

export const createDashboardMigrationsDataClientMock = jest.fn().mockImplementation(() => ({
  dashboards: new MockDashboardMigrationsDataDashboardsClient(),
  migration: new MockDashboardMigrationDataMigrationClient(),
}));

export const mockIndexName = 'mocked_siem_dashboards_migrations_index_name';
export const mockInstall = jest.fn().mockResolvedValue(undefined);
export const mockCreateClient = jest.fn(() => createDashboardMigrationsDataClientMock());
export const mockSetup = jest.fn().mockResolvedValue(undefined);

export const MockDashboardMigrationDataService = jest.fn().mockImplementation(() => ({
  createAdapter: jest.fn(),
  install: mockInstall,
  createClient: mockCreateClient,
  createDashboardIndexPatternAdapter: jest.fn().mockResolvedValue(mockIndexName),
  setup: mockSetup,
}));
