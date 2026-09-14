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
import type { GetSiemMigrationContext } from '../../../../lib/siem_migrations/get_siem_migration_context';
import type { RuleMigrationAllIntegrationsStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { createToolHandlerContext, createToolTestMocks } from '../../../__mocks__/test_helpers';
import { getIntegrationStatsTool } from './get_integration_stats_tool';

jest.mock('../common/privileges', () => ({
  hasRuleMigrationPrivileges: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { hasRuleMigrationPrivileges } = require('../common/privileges');

const productFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

const SAMPLE_STATS: RuleMigrationAllIntegrationsStats = [
  { id: 'endpoint', total_rules: 3 },
  { id: 'system', total_rules: 2 },
];

describe('getIntegrationStatsTool', () => {
  const { mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  let core: ReturnType<typeof coreMock.createSetup>;
  let mockGetIntegrationStats: jest.Mock;
  let mockMigrationsGet: jest.Mock;
  let getSiemMigrationContext: jest.MockedFunction<GetSiemMigrationContext>;

  beforeEach(() => {
    core = coreMock.createSetup();

    mockGetIntegrationStats = jest.fn().mockResolvedValue(SAMPLE_STATS);
    mockMigrationsGet = jest.fn().mockResolvedValue({ id: 'migration-1' });

    const rulesClient = {
      data: {
        migrations: { get: mockMigrationsGet },
        items: { getIntegrationStats: mockGetIntegrationStats },
      },
    };

    getSiemMigrationContext = jest
      .fn()
      .mockResolvedValue({ getRulesClient: () => rulesClient }) as jest.MockedFunction<GetSiemMigrationContext>;

    hasRuleMigrationPrivileges.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns scoped integration stats and forwards optional ids', async () => {
    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    const result = (await tool.handler(
      { migration_id: 'migration-1', ids: ['rule-1'] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(getSiemMigrationContext).toHaveBeenCalledWith(mockRequest, 'default');
    expect(mockMigrationsGet).toHaveBeenCalledWith('migration-1');
    expect(mockGetIntegrationStats).toHaveBeenCalledWith('migration-1', {
      ids: ['rule-1'],
      installable: true,
    });
    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.other, data: SAMPLE_STATS })
    );
  });

  it('returns error when user lacks privileges', async () => {
    hasRuleMigrationPrivileges.mockResolvedValue(false);

    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    const result = (await tool.handler(
      { migration_id: 'migration-1' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(getSiemMigrationContext).not.toHaveBeenCalled();
    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.error })
    );
    expect(result.results[0].data).toMatchObject({
      message: expect.stringContaining('privileges'),
    });
  });

  it('returns error when migration does not exist', async () => {
    mockMigrationsGet.mockResolvedValue(undefined);

    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    const result = (await tool.handler(
      { migration_id: 'unknown-migration' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockGetIntegrationStats).not.toHaveBeenCalled();
    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.error })
    );
    expect(result.results[0].data).toMatchObject({
      message: expect.stringContaining('unknown-migration'),
    });
  });

  it('passes installable:true and normalises empty ids to undefined', async () => {
    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    await tool.handler(
      { migration_id: 'migration-1' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(mockGetIntegrationStats).toHaveBeenCalledWith('migration-1', {
      ids: undefined,
      installable: true,
    });
  });

  it('catches unexpected errors from context factory and returns an error result', async () => {
    getSiemMigrationContext.mockRejectedValue(new Error('client construction failed'));

    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    const result = (await tool.handler(
      { migration_id: 'migration-1' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.error })
    );
    expect(result.results[0].data).toMatchObject({
      message: expect.stringContaining('client construction failed'),
    });
  });

  it('bounds ids array to 200 items', () => {
    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    expect(
      tool.schema.safeParse({
        migration_id: 'migration-1',
        ids: Array.from({ length: 201 }, (_, i) => `rule-${i}`),
      }).success
    ).toBe(false);
  });

  it('has the required annotations block', () => {
    const tool = getIntegrationStatsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    expect(tool.annotations).toMatchObject({
      title: 'Get Migration Integration Stats',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });
});
