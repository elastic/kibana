/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { replaceParams } from '@kbn/openapi-common/shared';
import {
  SIEM_RULE_MIGRATIONS_PATH,
  SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
  SIEM_RULE_MIGRATION_INSTALL_PATH,
  SIEM_RULE_MIGRATION_START_PATH,
  SIEM_RULE_MIGRATION_STATS_PATH,
  SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_RULE_MIGRATION_RESOURCES_PATH,
  SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH,
  SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH,
  SIEM_RULE_MIGRATION_RULES_PATH,
  SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH,
  SIEM_RULE_MIGRATION_PATH,
  SIEM_RULE_MIGRATION_STOP_PATH,
  SIEM_RULE_MIGRATION_UPDATE_INDEX_PATTERN_PATH,
} from '../../../../common/siem_migrations/constants';
import { KibanaServices } from '../../../common/lib/kibana';
import * as api from '.';
import { migrationRules } from '../__mocks__';

jest.mock('../../../common/lib/kibana');
const mockKibanaServices = KibanaServices.get as jest.Mock;

const migrationId = 'test-migration-id';
const signal = {} as AbortSignal;

describe('SIEM Rules API', () => {
  let mockHttp: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    const coreStart = coreMock.createStart({ basePath: '/mock' });
    mockHttp = coreStart.http;
    mockKibanaServices.mockReturnValue(coreStart);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRuleMigrationStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getRuleMigrationStats({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_STATS_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('getRuleMigrationsStatsAll', () => {
    it('calls http.get with correct params', async () => {
      await api.getRuleMigrationsStatsAll({ signal });
      expect(mockHttp.get).toHaveBeenCalledWith(SIEM_RULE_MIGRATIONS_ALL_STATS_PATH, {
        version: '1',
        signal,
      });
    });
  });

  describe('createRuleMigration', () => {
    it('calls http.put with correct params', async () => {
      await api.createRuleMigration({ name: 'test', signal });
      expect(mockHttp.put).toHaveBeenCalledWith(SIEM_RULE_MIGRATIONS_PATH, {
        version: '1',
        signal,
        body: JSON.stringify({ name: 'test' }),
      });
    });
  });

  describe('addRulesToMigration', () => {
    it('calls http.post with correct params', async () => {
      const originalRule = migrationRules[0].original_rule;
      await api.addRulesToMigration({ migrationId, body: [originalRule], signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify([originalRule]),
          signal,
        }
      );
    });
  });

  describe('getMissingResources', () => {
    it('calls http.get with correct params', async () => {
      await api.getMissingResources({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('upsertMigrationResources', () => {
    it('calls http.post with correct params', async () => {
      const mockResources = [{ name: 'resource1', type: 'macro' as const, content: 'test' }];
      await api.upsertMigrationResources({ migrationId, body: mockResources, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_RESOURCES_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify(mockResources),
          signal,
        }
      );
    });
  });

  describe('startRuleMigration', () => {
    it('calls http.post with correct params', async () => {
      await api.startRuleMigration({
        migrationId,
        settings: { connectorId: 'abc' },
        signal,
      });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_START_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          signal,
          body: JSON.stringify({
            settings: {
              connector_id: 'abc',
              skip_prebuilt_rules_matching: false,
            },
            retry: undefined,
            langsmith_options: undefined,
          }),
        }
      );
    });
  });

  describe('stopRuleMigration', () => {
    it('calls http.post with correct params', async () => {
      await api.stopRuleMigration({ migrationId, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_STOP_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          signal,
        }
      );
    });
  });

  describe('getMigrationRules', () => {
    it('calls http.get with correct params', async () => {
      await api.getMigrationRules({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          query: {
            page: undefined,
            per_page: undefined,
            sort_field: undefined,
            sort_direction: undefined,
            search_term: undefined,
            ids: undefined,
            is_prebuilt: undefined,
            is_installed: undefined,
            is_fully_translated: undefined,
            is_partially_translated: undefined,
            is_untranslatable: undefined,
            is_failed: undefined,
            is_missing_index: undefined,
          },
          signal,
        }
      );
    });
  });

  describe('getRuleMigrationMissingPrivileges', () => {
    it('calls http.get with correct params', async () => {
      await api.getRuleMigrationMissingPrivileges({ signal });
      expect(mockHttp.get).toHaveBeenCalledWith(SIEM_RULE_MIGRATION_MISSING_PRIVILEGES_PATH, {
        version: '1',
        signal,
      });
    });
  });

  describe('getRuleMigrationTranslationStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getRuleMigrationTranslationStats({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_TRANSLATION_STATS_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('installMigrationRules', () => {
    it('calls http.post with correct params', async () => {
      await api.installMigrationRules({ migrationId, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_INSTALL_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify({ ids: undefined, enabled: undefined }),
          signal,
        }
      );
    });
  });

  describe('getRuleMigrationsPrebuiltRules', () => {
    it('calls http.get with correct params', async () => {
      await api.getRuleMigrationsPrebuiltRules({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATIONS_PREBUILT_RULES_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('getIntegrations', () => {
    it('calls http.get with correct params', async () => {
      await api.getIntegrations({ signal });
      expect(mockHttp.get).toHaveBeenCalledWith(SIEM_RULE_MIGRATIONS_INTEGRATIONS_PATH, {
        version: '1',
        signal,
      });
    });
  });

  describe('getIntegrationsStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getIntegrationsStats({ signal });
      expect(mockHttp.get).toHaveBeenCalledWith(SIEM_RULE_MIGRATIONS_INTEGRATIONS_STATS_PATH, {
        version: '1',
        signal,
      });
    });
  });

  describe('updateMigration', () => {
    it('calls http.patch with correct params', async () => {
      await api.updateMigration({ migrationId, body: {}, signal });
      expect(mockHttp.patch).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify({}),
          signal,
        }
      );
    });
  });

  describe('updateMigrationRules', () => {
    it('calls http.patch with correct params', async () => {
      await api.updateMigrationRules({
        migrationId,
        rulesToUpdate: [],
        signal,
      });
      expect(mockHttp.patch).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_RULES_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify([]),
          signal,
        }
      );
    });
  });

  describe('updateIndexPattern', () => {
    it('calls http.post with correct params', async () => {
      await api.updateIndexPattern({
        migrationId,
        indexPattern: 'def',
        ids: ['abc'],
        signal,
      });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_UPDATE_INDEX_PATTERN_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify({ index_pattern: 'def', ids: ['abc'] }),
          signal,
        }
      );
    });
  });

  describe('deleteMigration', () => {
    it('calls http.delete with correct params', async () => {
      await api.deleteMigration({ migrationId: '123', signal });
      expect(mockHttp.delete).toHaveBeenCalledWith(
        replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: '123' }),
        {
          version: '1',
          signal,
        }
      );
    });
  });
});
