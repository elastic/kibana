/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { replaceParams } from '@kbn/openapi-common/shared';
import {
  SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
  SIEM_WORKFLOW_MIGRATIONS_PATH,
  SIEM_WORKFLOW_MIGRATION_PATH,
  SIEM_WORKFLOW_MIGRATION_START_PATH,
  SIEM_WORKFLOW_MIGRATION_STATS_PATH,
  SIEM_WORKFLOW_MIGRATION_STOP_PATH,
  SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
} from '../../../../common/siem_migrations/workflows/constants';
import { KibanaServices } from '../../../common/lib/kibana';
import * as api from './migrations';

jest.mock('../../../common/lib/kibana');
const mockKibanaServices = KibanaServices.get as jest.Mock;

const migrationId = 'test-migration-id';
const signal = {} as AbortSignal;

describe('SIEM Workflows Migrations API', () => {
  let mockHttp: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    const coreStart = coreMock.createStart({ basePath: '/mock' });
    mockHttp = coreStart.http;
    mockKibanaServices.mockReturnValue(coreStart);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkflowMigration', () => {
    it('calls http.put with correct params', async () => {
      await api.createWorkflowMigration({ name: 'test', signal });
      expect(mockHttp.put).toHaveBeenCalledWith(SIEM_WORKFLOW_MIGRATIONS_PATH, {
        version: '1',
        signal,
        body: JSON.stringify({ name: 'test' }),
      });
    });
  });

  describe('addWorkflowsToMigration', () => {
    it('calls http.post with correct params', async () => {
      const body = [{ name: 'story', agents: [], diagram_layout: {}, guid: 'g1' }] as never;
      await api.addWorkflowsToMigration({ migrationId, body, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH, { migration_id: migrationId }),
        {
          version: '1',
          body: JSON.stringify(body),
          signal,
        }
      );
    });
  });

  describe('startWorkflowMigration', () => {
    it('calls http.post with correct params', async () => {
      await api.startWorkflowMigration({
        migrationId,
        settings: { connectorId: 'connector-1' },
        signal,
      });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_WORKFLOW_MIGRATION_START_PATH, { migration_id: migrationId }),
        {
          version: '1',
          signal,
          body: JSON.stringify({
            settings: { connector_id: 'connector-1' },
            langsmith_options: undefined,
          }),
        }
      );
    });
  });

  describe('stopWorkflowMigration', () => {
    it('calls http.post with correct params', async () => {
      await api.stopWorkflowMigration({ migrationId, signal });
      expect(mockHttp.post).toHaveBeenCalledWith(
        replaceParams(SIEM_WORKFLOW_MIGRATION_STOP_PATH, { migration_id: migrationId }),
        { version: '1', signal }
      );
    });
  });

  describe('getWorkflowMigrationStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getWorkflowMigrationStats({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_WORKFLOW_MIGRATION_STATS_PATH, { migration_id: migrationId }),
        { version: '1', signal }
      );
    });
  });

  describe('getWorkflowMigrationAllStats', () => {
    it('calls http.get with correct params', async () => {
      await api.getWorkflowMigrationAllStats({ signal });
      expect(mockHttp.get).toHaveBeenCalledWith(SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH, {
        version: '1',
        signal,
      });
    });
  });

  describe('getWorkflowMigration', () => {
    it('calls http.get with correct params', async () => {
      await api.getWorkflowMigration({ migrationId, signal });
      expect(mockHttp.get).toHaveBeenCalledWith(
        replaceParams(SIEM_WORKFLOW_MIGRATION_PATH, { migration_id: migrationId }),
        { version: '1', signal }
      );
    });
  });
});
