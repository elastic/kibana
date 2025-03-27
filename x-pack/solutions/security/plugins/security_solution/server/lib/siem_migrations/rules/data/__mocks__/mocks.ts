/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataIntegrationsClient } from '../rule_migrations_data_integrations_client';
import type { RuleMigrationsDataLookupsClient } from '../rule_migrations_data_lookups_client';
import type { RuleMigrationsDataMigrationClient } from '../rule_migrations_data_migration_client';
import type { RuleMigrationsDataPrebuiltRulesClient } from '../rule_migrations_data_prebuilt_rules_client';
import type { RuleMigrationsDataResourcesClient } from '../rule_migrations_data_resources_client';
import type { RuleMigrationsDataRulesClient } from '../rule_migrations_data_rules_client';

// Rule migrations data rules client
export const mockRuleMigrationsDataRulesClient = {
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
} as unknown as jest.Mocked<RuleMigrationsDataRulesClient>;
export const MockRuleMigrationsDataRulesClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsDataRulesClient);

// Rule migrations data resources client
export const mockRuleMigrationsDataResourcesClient = {
  upsert: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
  searchBatches: jest.fn().mockReturnValue({
    next: jest.fn().mockResolvedValue([]),
    all: jest.fn().mockResolvedValue([]),
  }),
} as unknown as jest.Mocked<RuleMigrationsDataResourcesClient>;
export const MockRuleMigrationsDataResourcesClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsDataResourcesClient);

export const mockRuleMigrationsDataIntegrationsClient = {
  populate: jest.fn().mockResolvedValue(undefined),
  retrieveIntegrations: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<RuleMigrationsDataIntegrationsClient>;

export const mockRuleMigrationsDataPrebuiltRulesClient = {
  populate: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue([]),
} as unknown as jest.Mocked<RuleMigrationsDataPrebuiltRulesClient>;
export const mockRuleMigrationsDataLookupsClient = {
  create: jest.fn().mockResolvedValue(undefined),
  indexData: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<RuleMigrationsDataLookupsClient>;
export const mockRuleMigrationsDataMigrationsClient = {
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<RuleMigrationsDataMigrationClient>;

// Rule migrations data client
export const createRuleMigrationsDataClientMock = () => ({
  rules: mockRuleMigrationsDataRulesClient,
  resources: mockRuleMigrationsDataResourcesClient,
  integrations: mockRuleMigrationsDataIntegrationsClient,
  prebuiltRules: mockRuleMigrationsDataPrebuiltRulesClient,
  lookups: mockRuleMigrationsDataLookupsClient,
  migrations: mockRuleMigrationsDataMigrationsClient,
});

export const MockRuleMigrationsDataClient = jest
  .fn()
  .mockImplementation(() => createRuleMigrationsDataClientMock());

// Rule migrations data service
export const mockIndexName = 'mocked_siem_rule_migrations_index_name';
export const mockInstall = jest.fn().mockResolvedValue(undefined);
export const mockCreateClient = jest.fn(() => createRuleMigrationsDataClientMock());

export const MockRuleMigrationsDataService = jest.fn().mockImplementation(() => ({
  createAdapter: jest.fn(),
  install: mockInstall,
  createClient: mockCreateClient,
  createIndexNameProvider: jest.fn().mockResolvedValue(mockIndexName),
}));
