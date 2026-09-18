/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { coreMock } from '@kbn/core/server/mocks';
import type { ExperimentalFeatures } from '../../../common';
import type { SiemMigrationsService } from '../../lib/siem_migrations/siem_migrations_service';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { migrationResourcesListTool } from './migration_resources_tools';

const migrationId = '11111111-1111-4111-8111-111111111111';

/**
 * The resources list tool reads through the canonical SIEM rule-migrations data
 * client (`siemMigrationsService.createRulesClient().data.resources`), the same
 * data layer the migration HTTP routes use, instead of hand-rolling the
 * per-space index name and an ES query with `esClient.asCurrentUser`.
 */
describe('migration_resources_list — canonical migrations client', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const experimentalFeatures = {
    automaticMigrationSkillsEnabled: true,
  } as ExperimentalFeatures;

  const resourcesGet = jest.fn();
  const createRulesClient = jest.fn(() => ({
    data: { resources: { get: resourcesGet } },
  }));
  const siemMigrationsService = {
    createRulesClient,
  } as unknown as SiemMigrationsService;

  const getRulesClientWithRequest = jest.fn().mockResolvedValue({});
  const getActionsClientWithRequest = jest.fn().mockResolvedValue({});

  const listTool = migrationResourcesListTool(
    mockCore,
    mockLogger,
    experimentalFeatures,
    siemMigrationsService
  );

  const handlerContext = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();

    const coreStart = coreMock.createStart();

    const startPlugins = {
      alerting: { getRulesClientWithRequest },
      actions: { getActionsClientWithRequest },
      inference: {},
      fleet: { packageService: {} },
    } as unknown as SecuritySolutionPluginStartDependencies;

    mockCore.getStartServices.mockResolvedValue([coreStart, startPlugins, {} as never]);
  });

  it('delegates the listing to the canonical resources client instead of querying ES directly', async () => {
    resourcesGet.mockResolvedValue([
      {
        id: 'resource-1',
        migration_id: migrationId,
        type: 'macro',
        name: 'my_macro',
        content: 'eval x=1',
      },
    ]);

    const response = (await listTool.handler(
      { migration_id: migrationId, type: 'macro', max_results: 25 },
      handlerContext
    )) as ToolHandlerStandardReturn;

    expect(createRulesClient).toHaveBeenCalledWith(
      expect.objectContaining({
        request: mockRequest,
        spaceId: 'default',
        dependencies: expect.objectContaining({ experimentalFeatures }),
      })
    );
    expect(resourcesGet).toHaveBeenCalledWith(migrationId, {
      filters: { type: 'macro' },
      size: 25,
    });

    const [result] = response.results as Array<{
      type: string;
      data: { migration_id: string; total: number; resources: Array<Record<string, unknown>> };
    }>;
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.migration_id).toBe(migrationId);
    expect(result.data.total).toBe(1);
    expect(result.data.resources).toEqual([
      expect.objectContaining({ id: 'resource-1', name: 'my_macro' }),
    ]);

    expect(mockEsClient.asCurrentUser.search).not.toHaveBeenCalled();
  });

  it('applies the requested page size to the canonical client call', async () => {
    resourcesGet.mockResolvedValue([]);

    await listTool.handler({ migration_id: migrationId, max_results: 50 }, handlerContext);

    expect(resourcesGet).toHaveBeenCalledWith(migrationId, {
      filters: { type: undefined },
      size: 50,
    });
  });

  it('defaults max_results to 50 in the tool schema', () => {
    expect(listTool.schema.parse({ migration_id: migrationId }).max_results).toBe(50);
  });

  it('reports a canonical client failure as a tool error', async () => {
    resourcesGet.mockRejectedValue(new Error('index_not_found_exception'));

    const response = (await listTool.handler(
      { migration_id: migrationId, max_results: 50 },
      handlerContext
    )) as ToolHandlerStandardReturn;

    const [result] = response.results as Array<{ type: string; data: { message: string } }>;
    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toContain('index_not_found_exception');
  });
});
