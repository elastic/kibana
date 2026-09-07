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
import type { RuleMigrationIntegrationRuleGroups } from '../../../../lib/siem_migrations/rules/data/rule_migrations_data_rules_client';
import { createToolHandlerContext, createToolTestMocks } from '../../../__mocks__/test_helpers';
import { groupRulesByIntegrationsTool } from './group_rules_by_integrations_tool';

jest.mock('../common/privileges', () => ({
  hasRuleMigrationPrivileges: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { hasRuleMigrationPrivileges } = require('../common/privileges');

const productFeaturesService = {
  isEnabled: jest.fn().mockReturnValue(true),
} as unknown as ProductFeaturesService;

const SAMPLE_GROUPS: RuleMigrationIntegrationRuleGroups = {
  groups: [
    {
      integration_id: 'endpoint',
      total_rules: 3,
      installed_rules: 1,
      not_installed_rules: 2,
    },
  ],
  without_integrations: {
    total_rules: 1,
    installed_rules: 0,
    not_installed_rules: 1,
  },
};

describe('groupRulesByIntegrationsTool', () => {
  const { mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  let core: ReturnType<typeof coreMock.createSetup>;
  let mockGroupByIntegrations: jest.Mock;
  let mockMigrationsGet: jest.Mock;
  let getSiemMigrationContext: jest.MockedFunction<GetSiemMigrationContext>;

  beforeEach(() => {
    core = coreMock.createSetup();

    mockGroupByIntegrations = jest.fn().mockResolvedValue(SAMPLE_GROUPS);
    mockMigrationsGet = jest.fn().mockResolvedValue({ id: 'migration-1' });

    const rulesClient = {
      data: {
        migrations: { get: mockMigrationsGet },
        items: { groupByIntegrations: mockGroupByIntegrations },
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

  it('returns scoped integration groups and forwards optional ids', async () => {
    const tool = groupRulesByIntegrationsTool(
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
    expect(mockGroupByIntegrations).toHaveBeenCalledWith('migration-1', ['rule-1']);
    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.other, data: SAMPLE_GROUPS })
    );
  });

  it('returns error when user lacks privileges', async () => {
    hasRuleMigrationPrivileges.mockResolvedValue(false);

    const tool = groupRulesByIntegrationsTool(
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

    const tool = groupRulesByIntegrationsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    const result = (await tool.handler(
      { migration_id: 'unknown-migration' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    )) as ToolHandlerStandardReturn;

    expect(mockGroupByIntegrations).not.toHaveBeenCalled();
    expect(result.results[0]).toEqual(
      expect.objectContaining({ type: ToolResultType.error })
    );
    expect(result.results[0].data).toMatchObject({
      message: expect.stringContaining('unknown-migration'),
    });
  });

  it('catches unexpected errors from context factory and returns an error result', async () => {
    getSiemMigrationContext.mockRejectedValue(new Error('client construction failed'));

    const tool = groupRulesByIntegrationsTool(
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
    const tool = groupRulesByIntegrationsTool(
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
    const tool = groupRulesByIntegrationsTool(
      core,
      mockLogger,
      productFeaturesService,
      getSiemMigrationContext
    );
    expect(tool.annotations).toMatchObject({
      title: 'Group Migration Rules By Integrations',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });
});
