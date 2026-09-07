/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { coreMock } from '@kbn/core/server/mocks';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createToolHandlerContext, createToolTestMocks } from '../../../__mocks__/test_helpers';
import { installMigrationRulesTool } from './install_migration_rules_tool';

const productFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

describe('installMigrationRulesTool', () => {
  const { mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  let core: ReturnType<typeof coreMock.createSetup>;
  let fetch: jest.Mock;
  let checkPrivileges: jest.Mock;

  beforeEach(() => {
    core = coreMock.createSetup();
    fetch = jest.fn();
    checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested: true });
    const coreStart = coreMock.createStart();
    (coreStart.http.selfClient.asScoped as unknown as jest.Mock).mockReturnValue({ fetch });
    core.getStartServices.mockResolvedValue([
      coreStart,
      {
        security: {
          authz: {
            actions: { ui: { get: jest.fn().mockReturnValue('rules-edit-action') } },
            checkPrivilegesDynamicallyWithRequest: () => checkPrivileges,
          },
        },
      } as never,
      {},
    ]);
  });

  const tool = () => installMigrationRulesTool(core, mockLogger, productFeaturesService);

  it('requires confirmation and bounds selected ids', () => {
    expect(tool().confirmation).toEqual({ askUser: 'always' });
    expect(
      tool().schema.safeParse({
        migration_id: 'migration',
        ids: Array.from({ length: 201 }, (_, index) => `${index}`),
      }).success
    ).toBe(false);
  });

  it('installs a selected scope with the confirmed enabled state', async () => {
    fetch.mockResolvedValue({
      fetchOptions: {},
      request: new Request('http://localhost/x'),
      response: new Response(JSON.stringify({ installed: 2 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      body: { installed: 2 },
    });

    const result = (await tool().handler(
      { migration_id: 'migration', ids: ['a', 'b'], enabled: true },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: ['securitySolutionSiemMigrations.all', 'rules-edit-action'],
    });
    expect(fetch).toHaveBeenCalledWith(
      '/internal/siem_migrations/rules/migration/install',
      expect.objectContaining({
        method: 'POST',
        body: { ids: ['a', 'b'], enabled: true },
      })
    );
    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.other, data: { installed: 2 } })
    );
  });

  it('does not call the route without both required privileges', async () => {
    checkPrivileges.mockResolvedValue({ hasAllRequested: false });

    const result = (await tool().handler(
      { migration_id: 'migration', enabled: false },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(fetch).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data).toEqual(
      expect.objectContaining({ message: expect.stringContaining('Rules: All') })
    );
  });
});
