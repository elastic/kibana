/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
  SIEM_WORKFLOW_MIGRATIONS_PATH,
  SIEM_WORKFLOW_MIGRATION_PATH,
  SIEM_WORKFLOW_MIGRATION_START_PATH,
  SIEM_WORKFLOW_MIGRATION_STATS_PATH,
  SIEM_WORKFLOW_MIGRATION_STOP_PATH,
  SIEM_WORKFLOW_MIGRATION_TRANSLATION_STATS_PATH,
  SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
} from '../../../../../common/siem_migrations/workflows/constants';
import type { ConfigType } from '../../../../config';
import {
  requestContextMock,
  requestMock,
  serverMock,
} from '../../../detection_engine/routes/__mocks__';
import { registerSiemWorkflowMigrationsCreateRoute } from './create';
import { registerSiemWorkflowMigrationsRoutes } from '.';
import { registerSiemWorkflowMigrationsStartRoute } from './start';
import { registerSiemWorkflowMigrationsGetWorkflowsRoute } from './workflows/get';

const enabledConfig = {
  experimentalFeatures: { tinesWorkflowsMigration: true },
} as ConfigType;

const registeredPaths = (
  server: ReturnType<typeof serverMock.create>,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
) => server.router.versioned[method].mock.calls.map((call) => call[0].path);

describe('workflow migration routes', () => {
  const logger = loggerMock.create();

  it('registers the rule-migration equivalent endpoints when the feature is enabled', () => {
    const server = serverMock.create();
    registerSiemWorkflowMigrationsRoutes(server.router, enabledConfig, logger);

    expect(registeredPaths(server, 'put')).toEqual([SIEM_WORKFLOW_MIGRATIONS_PATH]);
    expect(registeredPaths(server, 'get')).toEqual([
      SIEM_WORKFLOW_MIGRATION_PATH,
      SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
      SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
      SIEM_WORKFLOW_MIGRATION_STATS_PATH,
      SIEM_WORKFLOW_MIGRATION_TRANSLATION_STATS_PATH,
    ]);
    expect(registeredPaths(server, 'post')).toEqual([
      SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
      SIEM_WORKFLOW_MIGRATION_START_PATH,
      SIEM_WORKFLOW_MIGRATION_STOP_PATH,
    ]);
    expect(registeredPaths(server, 'patch')).toEqual([
      SIEM_WORKFLOW_MIGRATION_PATH,
      SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
    ]);
    expect(registeredPaths(server, 'delete')).toEqual([SIEM_WORKFLOW_MIGRATION_PATH]);
  });

  it('does not register routes when the feature is disabled', () => {
    const server = serverMock.create();
    registerSiemWorkflowMigrationsRoutes(
      server.router,
      { experimentalFeatures: { tinesWorkflowsMigration: false } } as ConfigType,
      logger
    );

    expect(registeredPaths(server, 'put')).toEqual([]);
    expect(registeredPaths(server, 'get')).toEqual([]);
    expect(registeredPaths(server, 'post')).toEqual([]);
    expect(registeredPaths(server, 'patch')).toEqual([]);
    expect(registeredPaths(server, 'delete')).toEqual([]);
  });

  describe('handlers', () => {
    let server: ReturnType<typeof serverMock.create>;
    let context: ReturnType<typeof requestContextMock.createTools>['context'];

    beforeEach(() => {
      jest.clearAllMocks();
      server = serverMock.create();
      ({ context } = requestContextMock.createTools());
    });

    it('creates a migration with an empty id', async () => {
      registerSiemWorkflowMigrationsCreateRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'put',
          path: SIEM_WORKFLOW_MIGRATIONS_PATH,
          body: { name: 'Tines stories' },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ migration_id: '' });
    });

    it('rejects a create request without a name', () => {
      registerSiemWorkflowMigrationsCreateRoute(server.router, logger);
      const result = server.validate(
        requestMock.create({
          method: 'put',
          path: SIEM_WORKFLOW_MIGRATIONS_PATH,
          body: {},
        })
      );

      expect(result.badRequest).toHaveBeenCalled();
    });

    it('does not start a migration', async () => {
      registerSiemWorkflowMigrationsStartRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: SIEM_WORKFLOW_MIGRATION_START_PATH,
          params: { migration_id: 'mig-1' },
          body: { settings: { connector_id: 'connector-1' } },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ started: false });
    });

    it('returns an empty workflow list', async () => {
      registerSiemWorkflowMigrationsGetWorkflowsRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'get',
          path: SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
          params: { migration_id: 'mig-1' },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ total: 0, data: [] });
    });
  });
});
