/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';
import { RuleMigrationsDataResourcesClient } from './rule_migrations_data_resources_client';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SiemMigrationsClientDependencies } from '../../common/types';

jest.mock('./rule_migrations_data_rules_client');
jest.mock('./rule_migrations_data_resources_client');

const mockedRulesClient = {
  prepareDelete: jest
    .fn()
    .mockReturnValue([
      { delete: { _id: 'rule1', _index: '.mocked-rule-index' } },
      { delete: { _id: 'rule2', _index: '.mocked-rule-index' } },
    ]),
} as unknown as jest.Mocked<RuleMigrationsDataRulesClient>;

const mockedResourcesClient = {
  prepareDelete: jest
    .fn()
    .mockReturnValue([{ delete: { _id: 'resource1', _index: '.mocked-resource-index' } }]),
} as unknown as jest.Mocked<RuleMigrationsDataResourcesClient>;

const mockIndexNameProviders = {
  migrations: jest.fn().mockReturnValue('.mocked-migration-index'),
  rules: jest.fn().mockReturnValue('.mocked-rule-index'),
  resources: jest.fn().mockReturnValue('.mocked-resource-index'),
  prebuiltrules: jest.fn().mockReturnValue('.mocked-prebuilt-rules-index'),
  integrations: jest.fn().mockReturnValue('.mocked-integrations-index'),
};

const mockCurrentUser = {
  username: 'testUser',
  profile_uid: 'testProfileUid',
} as unknown as AuthenticatedUser;

const mockEsClient = {
  asInternalUser: {
    bulk: jest.fn().mockResolvedValue({ errors: false }),
  },
} as unknown as jest.Mocked<IScopedClusterClient>;

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
} as unknown as jest.Mocked<Logger>;

const mockSpaceId = 'default';
const mockDependencies = {} as unknown as jest.Mocked<SiemMigrationsClientDependencies>;

describe('RuleMigrationsDataClient', () => {
  beforeEach(() => {
    (RuleMigrationsDataRulesClient as unknown as jest.Mock).mockImplementation(
      () => mockedRulesClient
    );
    (RuleMigrationsDataResourcesClient as unknown as jest.Mock).mockImplementation(
      () => mockedResourcesClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('deleteMigration', () => {
    it('should delete the migration and associated rules and resources', async () => {
      const dataClient = new RuleMigrationsDataClient(
        mockIndexNameProviders,
        mockCurrentUser,
        mockEsClient,
        mockLogger,
        mockSpaceId,
        mockDependencies
      );

      const migrationId = 'testId';

      await dataClient.deleteMigration(migrationId);

      expect(mockEsClient.asInternalUser.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        operations: [
          { delete: { _id: migrationId, _index: '.mocked-migration-index' } },
          { delete: { _id: 'rule1', _index: '.mocked-rule-index' } },
          { delete: { _id: 'rule2', _index: '.mocked-rule-index' } },
          { delete: { _id: 'resource1', _index: '.mocked-resource-index' } },
        ],
      });
    });
  });
});
