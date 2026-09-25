/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  SIEM_WORKFLOW_MIGRATIONS_PATH,
  SIEM_WORKFLOW_MIGRATION_START_PATH,
  SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH,
} from '../../../../../common/siem_migrations/workflows/constants';
import simpleStory from '../../../../../common/siem_migrations/parsers/tines/mock/simple_story.json';
import {
  requestContextMock,
  requestMock,
  serverMock,
} from '../../../detection_engine/routes/__mocks__';
import { registerSiemWorkflowMigrationsCreateRoute } from './create';
import { registerSiemWorkflowMigrationsCreateWorkflowsRoute } from './workflows/create';
import { registerSiemWorkflowMigrationsStartRoute } from './start';
import { createWorkflowMigrationClient } from '../__mocks__/mocks';

describe('Workflow migrations API smoke', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.createTools>['context'];
  const workflowsClient = createWorkflowMigrationClient();
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.securitySolution.getInferenceClient = jest.fn().mockReturnValue({
      getConnectorById: jest.fn().mockResolvedValue({ id: 'connector-1' }),
    });
    (context.securitySolution.siemMigrations as unknown as { getWorkflowsClient: jest.Mock })
      .getWorkflowsClient = jest.fn().mockReturnValue(workflowsClient);

    workflowsClient.data.migrations.create.mockResolvedValue('mig-1');
    workflowsClient.data.migrations.get.mockResolvedValue({ id: 'mig-1', name: 'test' });
    workflowsClient.data.items.create.mockResolvedValue(undefined);
    workflowsClient.task.start.mockResolvedValue({ exists: true, started: true });
  });

  it('creates a migration', async () => {
    registerSiemWorkflowMigrationsCreateRoute(server.router, logger);

    const request = requestMock.create({
      method: 'put',
      path: SIEM_WORKFLOW_MIGRATIONS_PATH,
      body: { name: 'My Tines migration' },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ migration_id: 'mig-1' });
    expect(workflowsClient.data.migrations.create).toHaveBeenCalledWith('My Tines migration');
  });

  it('uploads stories into a migration', async () => {
    registerSiemWorkflowMigrationsCreateWorkflowsRoute(server.router, logger);

    const path = SIEM_WORKFLOW_MIGRATION_WORKFLOWS_PATH.replace('{migration_id}', 'mig-1');
    const request = requestMock.create({
      method: 'post',
      path,
      params: { migration_id: 'mig-1' },
      body: [simpleStory],
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(workflowsClient.data.items.create).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          migration_id: 'mig-1',
          original_workflow: expect.objectContaining({
            vendor: 'tines',
            title: simpleStory.name,
          }),
        }),
      ])
    );
  });

  it('starts a migration task', async () => {
    registerSiemWorkflowMigrationsStartRoute(server.router, logger);

    const path = SIEM_WORKFLOW_MIGRATION_START_PATH.replace('{migration_id}', 'mig-1');
    const request = requestMock.create({
      method: 'post',
      path,
      params: { migration_id: 'mig-1' },
      body: { settings: { connector_id: 'connector-1' } },
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ started: true });
    expect(workflowsClient.task.start).toHaveBeenCalledWith(
      expect.objectContaining({
        migrationId: 'mig-1',
        connectorId: 'connector-1',
      })
    );
  });
});
