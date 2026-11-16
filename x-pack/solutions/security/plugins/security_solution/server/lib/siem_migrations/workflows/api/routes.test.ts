/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { RouteMethod } from '@kbn/core-http-server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SIEM_WORKFLOW_MIGRATIONS_ALL_STATS_PATH,
  SIEM_WORKFLOW_MIGRATIONS_PATH,
  SIEM_WORKFLOW_MIGRATION_PATH,
  SIEM_WORKFLOW_MIGRATION_START_PATH,
  SIEM_WORKFLOW_MIGRATION_STATS_PATH,
  SIEM_WORKFLOW_MIGRATION_STOP_PATH,
  SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
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
import { registerSiemWorkflowMigrationsDeleteRoute } from './delete';
import { registerSiemWorkflowMigrationsGetRoute } from './get';
import { registerSiemWorkflowMigrationsRoutes } from '.';
import { registerSiemWorkflowMigrationsStartRoute } from './start';
import { registerSiemWorkflowMigrationsUpdateRoute } from './update';
import { registerSiemWorkflowMigrationsGetWorkflowsRoute } from './workflows/get';
import { registerSiemWorkflowMigrationsCreateTinesWorkflowsRoute } from './workflows/tines/create';

const enabledConfig = {
  experimentalFeatures: { tinesWorkflowsMigration: true },
} as ConfigType;

const tinesStory = {
  name: 'Receive alert',
  description: 'Imported from Tines',
  guid: 'story-guid-1',
  agents: [
    {
      type: 'Agents::WebhookAgent',
      name: 'Receive Alert',
      guid: 'agent-guid-1',
    },
  ],
};

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
      SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
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
    let clients: ReturnType<typeof requestContextMock.createTools>['clients'];

    beforeEach(() => {
      jest.clearAllMocks();
      server = serverMock.create();
      ({ context, clients } = requestContextMock.createTools());
    });

    const invokeHandler = async (
      method: Exclude<RouteMethod, 'options'>,
      path: string,
      request: ReturnType<typeof requestMock.create>
    ) => {
      const response = httpServerMock.createResponseFactory();
      const handler = server.router.versioned.getRoute(method, path).versions['1'].handler;
      await handler(requestContextMock.convertContext(context), request, response);
      return response;
    };

    it('creates a migration and returns the stored id', async () => {
      registerSiemWorkflowMigrationsCreateRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'put',
          path: SIEM_WORKFLOW_MIGRATIONS_PATH,
          body: { name: 'Tines stories' },
        }),
        requestContextMock.convertContext(context)
      );

      expect(clients.siemWorkflowMigrationsClient.data.migrations.create).toHaveBeenCalledWith(
        'Tines stories'
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ migration_id: 'migration-1' });
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

    it('returns the stored migration', async () => {
      registerSiemWorkflowMigrationsGetRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'get',
          path: SIEM_WORKFLOW_MIGRATION_PATH,
          params: { migration_id: 'mig-1' },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        id: 'mig-1',
        name: 'Tines stories',
        created_by: 'user',
        created_at: '2026-01-01T00:00:00.000Z',
      });
    });

    it('returns 404 when the migration is not stored', async () => {
      clients.siemWorkflowMigrationsClient.data.migrations.get.mockResolvedValueOnce(undefined);
      registerSiemWorkflowMigrationsGetRoute(server.router, logger);
      const response = await invokeHandler(
        'get',
        SIEM_WORKFLOW_MIGRATION_PATH,
        requestMock.create({
          method: 'get',
          path: SIEM_WORKFLOW_MIGRATION_PATH,
          routePath: SIEM_WORKFLOW_MIGRATION_PATH,
          params: { migration_id: 'missing' },
        })
      );

      expect(response.notFound).toHaveBeenCalled();
    });

    it('renames a stored migration', async () => {
      registerSiemWorkflowMigrationsUpdateRoute(server.router, logger);
      const response = await invokeHandler(
        'patch',
        SIEM_WORKFLOW_MIGRATION_PATH,
        requestMock.create({
          method: 'patch',
          path: SIEM_WORKFLOW_MIGRATION_PATH,
          routePath: SIEM_WORKFLOW_MIGRATION_PATH,
          params: { migration_id: 'mig-1' },
          body: { name: 'Renamed stories' },
        })
      );

      expect(clients.siemWorkflowMigrationsClient.data.migrations.update).toHaveBeenCalledWith(
        'mig-1',
        { name: 'Renamed stories' }
      );
      expect(response.ok).toHaveBeenCalled();
    });

    it('returns 500 when deleting a migration fails', async () => {
      clients.siemWorkflowMigrationsClient.data.deleteMigration.mockRejectedValueOnce(
        new Error('index write blocked')
      );
      registerSiemWorkflowMigrationsDeleteRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'delete',
          path: SIEM_WORKFLOW_MIGRATION_PATH,
          params: { migration_id: 'mig-1' },
        }),
        requestContextMock.convertContext(context)
      );

      expect(clients.siemWorkflowMigrationsClient.data.deleteMigration).toHaveBeenCalledWith(
        'mig-1'
      );
      expect(response.status).toEqual(500);
    });

    it('stores a Tines story as a workflow document', async () => {
      registerSiemWorkflowMigrationsCreateTinesWorkflowsRoute(server.router, logger);
      const response = await invokeHandler(
        'post',
        SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
        requestMock.create({
          method: 'post',
          path: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          routePath: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          params: { migration_id: 'mig-1' },
          body: [tinesStory],
        })
      );

      expect(clients.siemWorkflowMigrationsClient.data.items.create).toHaveBeenCalledWith([
        {
          migration_id: 'mig-1',
          original_workflow: {
            id: 'story-guid-1',
            vendor: 'tines',
            title: 'Receive alert',
            description: 'Imported from Tines',
            data: JSON.stringify(tinesStory),
            format: 'json',
          },
        },
      ]);
      expect(response.ok).toHaveBeenCalled();
    });

    it('uses the story name when the export has no guid and omits a null description', async () => {
      const story = {
        name: 'Untitled story',
        description: null,
        agents: [{ type: 'Agents::EventTransformationAgent', name: 'Map', guid: 'agent-2' }],
      };
      registerSiemWorkflowMigrationsCreateTinesWorkflowsRoute(server.router, logger);
      await invokeHandler(
        'post',
        SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
        requestMock.create({
          method: 'post',
          path: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          routePath: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          params: { migration_id: 'mig-1' },
          body: [story],
        })
      );

      expect(clients.siemWorkflowMigrationsClient.data.items.create).toHaveBeenCalledWith([
        {
          migration_id: 'mig-1',
          original_workflow: {
            id: 'Untitled story',
            vendor: 'tines',
            title: 'Untitled story',
            data: JSON.stringify(story),
            format: 'json',
          },
        },
      ]);
    });

    it('does not store workflows when the Tines story list is empty', async () => {
      registerSiemWorkflowMigrationsCreateTinesWorkflowsRoute(server.router, logger);
      const response = await invokeHandler(
        'post',
        SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
        requestMock.create({
          method: 'post',
          path: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          routePath: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          params: { migration_id: 'mig-1' },
          body: [],
        })
      );

      expect(clients.siemWorkflowMigrationsClient.data.items.create).not.toHaveBeenCalled();
      expect(response.noContent).toHaveBeenCalled();
    });

    it('rejects a Tines body that is not a story export', () => {
      registerSiemWorkflowMigrationsCreateTinesWorkflowsRoute(server.router, logger);
      const result = server.validate(
        requestMock.create({
          method: 'post',
          path: SIEM_WORKFLOW_MIGRATION_TINES_WORKFLOWS_PATH,
          params: { migration_id: 'mig-1' },
          body: [{ name: 'Missing agents' }],
        })
      );

      expect(result.badRequest).toHaveBeenCalled();
    });

    it('lists stored workflows with the request filters', async () => {
      const stored = { total: 1, data: [{ id: 'wf-1' }] };
      clients.siemWorkflowMigrationsClient.data.items.get.mockResolvedValueOnce(stored);
      registerSiemWorkflowMigrationsGetWorkflowsRoute(server.router, logger);
      const response = await server.inject(
        requestMock.create({
          method: 'get',
          path: SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
          params: { migration_id: 'mig-1' },
          query: {
            page: 1,
            per_page: 25,
            sort_field: 'original_workflow.title',
            sort_direction: 'desc',
            search_term: 'alert',
            is_installed: false,
            is_fully_translated: true,
            is_partially_translated: false,
            is_untranslatable: false,
            is_failed: false,
          },
        }),
        requestContextMock.convertContext(context)
      );

      expect(clients.siemWorkflowMigrationsClient.data.items.get).toHaveBeenCalledWith('mig-1', {
        filters: {
          searchTerm: 'alert',
          ids: undefined,
          installed: false,
          fullyTranslated: true,
          partiallyTranslated: false,
          untranslatable: false,
          failed: false,
        },
        sort: { sortField: 'original_workflow.title', sortDirection: 'desc' },
        size: 25,
        from: 25,
      });
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(stored);
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
  });
});
