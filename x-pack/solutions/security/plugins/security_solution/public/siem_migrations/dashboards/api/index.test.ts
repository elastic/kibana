/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { replaceParams } from '@kbn/openapi-common/shared';
import { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import {
  SIEM_DASHBOARD_MIGRATIONS_ALL_STATS_PATH,
  SIEM_DASHBOARD_MIGRATIONS_PATH,
  SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
  SIEM_DASHBOARD_MIGRATION_INSTALL_PATH,
  SIEM_DASHBOARD_MIGRATION_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH,
  SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH,
  SIEM_DASHBOARD_MIGRATION_START_PATH,
  SIEM_DASHBOARD_MIGRATION_STATS_PATH,
  SIEM_DASHBOARD_MIGRATION_STOP_PATH,
  SIEM_DASHBOARD_MIGRATION_TRANSLATION_STATS_PATH,
} from '../../../../common/siem_migrations/dashboards/constants';
import type { LangSmithOptions } from '../../../../common/siem_migrations/model/common.gen';
import { KibanaServices } from '../../../common/lib/kibana';
import * as api from '.';

jest.mock('../../../common/lib/kibana');
const mockKibanaServices = KibanaServices.get as jest.Mock;

const migrationId = 'test-migration-id';
const signal = {} as AbortSignal;

describe('SIEM Dashboards API', () => {
  let mockHttp: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    const coreStart = coreMock.createStart({ basePath: '/mock' });
    mockHttp = coreStart.http;
    mockKibanaServices.mockReturnValue(coreStart);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDashboardMigration', () => {
    it('calls http.put with correct params', async () => {
      await api.createDashboardMigration({ name: 'test', signal });
      expect(mockHttp.put).toHaveBeenCalledWith(SIEM_DASHBOARD_MIGRATIONS_PATH, {
        version: '1',
        signal,
        body: JSON.stringify({ name: 'test' }),
      });
    });
  });

  describe('getDashboardMigration', () => {
    it('calls http.get with correct params', async () => {
      await api.getDashboardMigration({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, { migration_id: migrationId }),
        { version: '1', signal }
      );
    });
  });

  describe('getDashboardMigrationStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getDashboardMigrationStats({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_STATS_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('getDashboardMigrationTranslationStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getDashboardMigrationTranslationStats({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_TRANSLATION_STATS_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('updateDashboardMigration', () => {
    it('calls http.patch with correct params', async () => {
      const body = { name: 'bar' };
      await api.updateDashboardMigration({ migrationId, body, signal });
      expect(mockHttp.patch).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, { migration_id: migrationId }),
        {
          version: '1',
          signal,
          body: JSON.stringify(body),
        }
      );
    });
  });

  describe('getMigrationDashboards', () => {
    it('calls http.get with correct query params', async () => {
      const filters = {
        searchTerm: 'abc',
        ids: ['id1'],
        installed: true,
        fullyTranslated: false,
        partiallyTranslated: true,
        untranslatable: false,
        failed: true,
      };
      await api.getMigrationDashboards({
        migrationId,
        page: 2,
        perPage: 10,
        sortField: 'name',
        sortDirection: 'asc',
        filters,
        signal,
      });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          query: {
            page: 2,
            per_page: 10,
            sort_field: 'name',
            sort_direction: 'asc',
            search_term: filters.searchTerm,
            ids: filters.ids,
            is_installed: filters.installed,
            is_fully_translated: filters.fullyTranslated,
            is_partially_translated: filters.partiallyTranslated,
            is_untranslatable: filters.untranslatable,
            is_failed: filters.failed,
          },
          signal,
        }
      );
    });

    it('calls http.get with correct query params when no filters are provided', async () => {
      await api.getMigrationDashboards({
        migrationId,
        page: 1,
        perPage: 20,
        sortField: 'id',
        sortDirection: 'desc',
        signal,
      });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          query: {
            page: 1,
            per_page: 20,
            sort_field: 'id',
            sort_direction: 'desc',
            search_term: undefined,
            ids: undefined,
            is_installed: undefined,
            is_fully_translated: undefined,
            is_partially_translated: undefined,
            is_untranslatable: undefined,
            is_failed: undefined,
          },
          signal,
        }
      );
    });
  });

  describe('addDashboardsToDashboardMigration', () => {
    it('calls http.post with correct params', async () => {
      await api.addDashboardsToDashboardMigration({ migrationId, body: [], signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH, {
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

  describe('installMigrationDashboards', () => {
    it('calls http.post with correct params', async () => {
      const ids = ['id1', 'id2'];
      await api.installMigrationDashboards({ migrationId, ids, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_INSTALL_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          body: JSON.stringify({ ids }),
          signal,
        }
      );
    });
  });

  describe('getDashboardMigrationMissingResources', () => {
    it('calls http.get with correct params', async () => {
      await api.getDashboardMigrationMissingResources({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_MISSING_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('upsertDashboardMigrationResources', () => {
    it('calls http.post with correct params', async () => {
      await api.upsertDashboardMigrationResources({ migrationId, body: [], signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH, {
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

  describe('getDashboardMigrationResources', () => {
    it('calls http.get with correct params', async () => {
      await api.getDashboardMigrationResources({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH, {
          migration_id: migrationId,
        }),
        { version: '1', signal }
      );
    });
  });

  describe('startDashboardMigration', () => {
    it('calls http.post with correct params', async () => {
      const connectorId = 'conn-id';
      const retry = SiemMigrationRetryFilter.FAILED;
      const langSmithOptions: LangSmithOptions = {
        project_name: 'test',
        api_key: 'key',
      };
      await api.startDashboardMigration({
        migrationId,
        signal,
        settings: { connectorId },
        retry,
        langSmithOptions,
      });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_START_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          signal,
          body: JSON.stringify({
            settings: { connector_id: connectorId },
            langsmith_options: langSmithOptions,
            retry,
          }),
        }
      );
    });
  });

  describe('stopDashboardMigration', () => {
    it('calls http.post with correct params', async () => {
      await api.stopDashboardMigration({ migrationId, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_STOP_PATH, {
          migration_id: migrationId,
        }),
        {
          version: '1',
          signal,
        }
      );
    });
  });

  describe('getDashboardMigrationAllStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getDashboardMigrationAllStats({ signal });
      expect(mockHttp.get).toHaveBeenCalledWith(SIEM_DASHBOARD_MIGRATIONS_ALL_STATS_PATH, {
        version: '1',
        signal,
      });
    });
  });

  describe('deleteDashboardMigration', () => {
    it('calls http.delete with correct params', async () => {
      await api.deleteDashboardMigration({ migrationId, signal });
      expect(mockHttp.delete).toHaveBeenCalledWith(
        replaceParams(SIEM_DASHBOARD_MIGRATION_PATH, { migration_id: migrationId }),
        { version: '1', signal }
      );
    });
  });
});
