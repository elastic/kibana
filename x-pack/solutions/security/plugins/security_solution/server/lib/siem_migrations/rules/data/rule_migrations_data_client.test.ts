/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { SiemMigrationsDataResourcesClient } from '../../common/data/siem_migrations_data_resources_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';

vi.mock('./rule_migrations_data_rules_client');
vi.mock('../../common/data/siem_migrations_data_resources_client');

const mockedRulesClient = {
  prepareDelete: vi
    .fn()
    .mockReturnValue([
      { delete: { _id: 'rule1', _index: '.mocked-rule-index' } },
      { delete: { _id: 'rule2', _index: '.mocked-rule-index' } },
    ]),
} as unknown as Mocked<RuleMigrationsDataRulesClient>;

const mockedResourcesClient = {
  prepareDelete: vi
    .fn()
    .mockReturnValue([{ delete: { _id: 'resource1', _index: '.mocked-resource-index' } }]),
} as unknown as Mocked<SiemMigrationsDataResourcesClient>;

const mockIndexNameProviders = {
  migrations: vi.fn().mockReturnValue('.mocked-migration-index'),
  rules: vi.fn().mockReturnValue('.mocked-rule-index'),
  resources: vi.fn().mockReturnValue('.mocked-resource-index'),
  prebuiltrules: vi.fn().mockReturnValue('.mocked-prebuilt-rules-index'),
  integrations: vi.fn().mockReturnValue('.mocked-integrations-index'),
};

const mockCurrentUser = {
  username: 'testUser',
  profile_uid: 'testProfileUid',
} as unknown as AuthenticatedUser;

const mockEsClient = {
  asInternalUser: {
    bulk: vi.fn().mockResolvedValue({ errors: false }),
  },
} as unknown as Mocked<IScopedClusterClient>;

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
} as unknown as Mocked<Logger>;

const mockSpaceId = 'default';
const mockDependencies = {} as unknown as Mocked<SiemMigrationsClientDependencies>;

describe('RuleMigrationsDataClient', () => {
  beforeEach(() => {
    (RuleMigrationsDataRulesClient as unknown as Mock).mockImplementation(() => mockedRulesClient);
    (SiemMigrationsDataResourcesClient as unknown as Mock).mockImplementation(
      () => mockedResourcesClient
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
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
