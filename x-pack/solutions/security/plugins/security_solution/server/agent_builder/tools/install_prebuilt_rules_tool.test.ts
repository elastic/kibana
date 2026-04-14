/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { BehaviorSubject } from 'rxjs';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import {
  installPrebuiltRulesTool,
  SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID,
} from './install_prebuilt_rules_tool';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRules } from '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules';
import { createDetectionRulesClient } from '../../lib/detection_engine/rule_management/logic/detection_rules_client/detection_rules_client';
import { buildMlAuthz } from '../../lib/machine_learning/authz';
import { calculateRulesAuthz } from '../../lib/detection_engine/rule_management/authz';
import type { ProductFeaturesService } from '../../lib/product_features_service';
import type { SecuritySolutionPluginSetupDependencies } from '../../plugin_contract';

jest.mock(
  '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client',
  () => ({ createPrebuiltRuleAssetsClient: jest.fn() })
);
jest.mock(
  '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client',
  () => ({ createPrebuiltRuleObjectsClient: jest.fn() })
);
jest.mock(
  '../../lib/detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules',
  () => ({ createPrebuiltRules: jest.fn() })
);
jest.mock(
  '../../lib/detection_engine/rule_management/logic/detection_rules_client/detection_rules_client',
  () => ({ createDetectionRulesClient: jest.fn() })
);
jest.mock('../../lib/machine_learning/authz', () => ({ buildMlAuthz: jest.fn() }));
jest.mock('../../lib/detection_engine/rule_management/authz', () => ({
  calculateRulesAuthz: jest.fn(),
}));

const mockCreatePrebuiltRuleAssetsClient = createPrebuiltRuleAssetsClient as jest.Mock;
const mockCreatePrebuiltRuleObjectsClient = createPrebuiltRuleObjectsClient as jest.Mock;
const mockCreatePrebuiltRules = createPrebuiltRules as jest.Mock;
const mockCreateDetectionRulesClient = createDetectionRulesClient as jest.Mock;
const mockBuildMlAuthz = buildMlAuthz as jest.Mock;
const mockCalculateRulesAuthz = calculateRulesAuthz as jest.Mock;

const createMockRuleAsset = (ruleId: string, name: string) => ({
  rule_id: ruleId,
  name,
  description: `Description for ${name}`,
  severity: 'high' as const,
  risk_score: 73,
  type: 'query' as const,
  version: 1,
  tags: ['Elastic', 'Windows'],
  language: 'kuery',
  query: `test query for ${ruleId}`,
});

const createMockRuleResponse = (ruleId: string, name: string) => ({
  rule_id: ruleId,
  name,
  severity: 'high',
  id: `rule-object-id-${ruleId}`,
});

describe('installPrebuiltRulesTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();

  const mockPlugins = {
    ml: undefined,
  } as unknown as SecuritySolutionPluginSetupDependencies;

  const mockProductFeaturesService = {} as ProductFeaturesService;

  const mockRulesClient = { find: jest.fn() };
  const mockActionsClient = { getAll: jest.fn() };
  const mockLicense$ = new BehaviorSubject({ isActive: true, type: 'platinum' });
  const mockDetectionRulesClient = { createPrebuiltRule: jest.fn() };
  const mockMlAuthz = { validateRuleType: jest.fn() };
  const mockRulesAuthz = { canReadRules: true, canEditRules: true };

  const mockFetchLatestAssets = jest.fn();
  const mockFetchInstalledRuleVersions = jest.fn();

  const tool = installPrebuiltRulesTool(
    mockCore,
    mockLogger,
    mockPlugins,
    mockProductFeaturesService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
    const mockSavedObjectsClient = { find: jest.fn(), get: jest.fn() };
    Object.assign(mockCoreStart.savedObjects, {
      getScopedClient: jest.fn().mockReturnValue(mockSavedObjectsClient),
    });

    mockCore.getStartServices.mockResolvedValue([
      mockCoreStart,
      {
        alerting: { getRulesClientWithRequest: jest.fn().mockResolvedValue(mockRulesClient) },
        actions: { getActionsClientWithRequest: jest.fn().mockResolvedValue(mockActionsClient) },
        licensing: { license$: mockLicense$ },
      },
      {},
    ]);

    mockCreatePrebuiltRuleAssetsClient.mockReturnValue({
      fetchLatestAssets: mockFetchLatestAssets,
    });
    mockCreatePrebuiltRuleObjectsClient.mockReturnValue({
      fetchInstalledRuleVersions: mockFetchInstalledRuleVersions,
    });
    mockCreateDetectionRulesClient.mockReturnValue(mockDetectionRulesClient);
    mockBuildMlAuthz.mockReturnValue(mockMlAuthz);
    mockCalculateRulesAuthz.mockResolvedValue(mockRulesAuthz);
  });

  describe('schema', () => {
    it('validates a valid input with rule_ids', () => {
      const result = tool.schema.safeParse({ rule_ids: ['rule-1', 'rule-2'] });
      expect(result.success).toBe(true);
    });

    it('rejects an empty rule_ids array', () => {
      const result = tool.schema.safeParse({ rule_ids: [] });
      expect(result.success).toBe(false);
    });

    it('rejects more than 50 rule_ids', () => {
      const ruleIds = Array.from({ length: 51 }, (_, i) => `rule-${i}`);
      const result = tool.schema.safeParse({ rule_ids: ruleIds });
      expect(result.success).toBe(false);
    });

    it('rejects missing rule_ids', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-string rule_ids', () => {
      const result = tool.schema.safeParse({ rule_ids: [123] });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(SECURITY_INSTALL_PREBUILT_RULES_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'detection', 'prebuilt-rules', 'install']);
    });

    it('has confirmation policy set to always', () => {
      expect(tool.confirmation?.askUser).toBe('always');
    });
  });

  describe('handler', () => {
    const getResultData = (result: unknown) => {
      const standardResult = result as ToolHandlerStandardReturn;
      return standardResult.results[0].data as Record<string, unknown>;
    };

    it('installs rules successfully', async () => {
      const ruleAsset = createMockRuleAsset('rule-1', 'Test Rule 1');
      mockFetchLatestAssets.mockResolvedValue([ruleAsset]);
      mockFetchInstalledRuleVersions.mockResolvedValue([]);
      mockCreatePrebuiltRules.mockResolvedValue({
        results: [{ result: createMockRuleResponse('rule-1', 'Test Rule 1') }],
        errors: [],
      });

      const result = await tool.handler(
        { rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const standardResult = result as ToolHandlerStandardReturn;
      expect(standardResult.results[0].type).toBe(ToolResultType.other);
      const data = getResultData(result);
      expect(data.summary).toEqual({
        total: 1,
        installed: 1,
        already_installed: 0,
        not_found: 0,
        failed: 0,
      });
      expect(data.installed_rules).toEqual([
        { rule_id: 'rule-1', name: 'Test Rule 1', severity: 'high' },
      ]);
    });

    it('skips already installed rules', async () => {
      const ruleAsset = createMockRuleAsset('rule-1', 'Test Rule 1');
      mockFetchLatestAssets.mockResolvedValue([ruleAsset]);
      mockFetchInstalledRuleVersions.mockResolvedValue([
        { rule_id: 'rule-1', version: 1, id: 'obj-1', tags: [] },
      ]);
      mockCreatePrebuiltRules.mockResolvedValue({ results: [], errors: [] });

      const result = await tool.handler(
        { rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const data = getResultData(result);
      expect(data.summary).toEqual({
        total: 1,
        installed: 0,
        already_installed: 1,
        not_found: 0,
        failed: 0,
      });
      expect(data.already_installed_rule_ids).toEqual(['rule-1']);
      expect(mockCreatePrebuiltRules).toHaveBeenCalledWith(
        expect.anything(),
        [],
        expect.anything()
      );
    });

    it('reports not found rules', async () => {
      mockFetchLatestAssets.mockResolvedValue([]);
      mockFetchInstalledRuleVersions.mockResolvedValue([]);
      mockCreatePrebuiltRules.mockResolvedValue({ results: [], errors: [] });

      const result = await tool.handler(
        { rule_ids: ['nonexistent-rule'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const data = getResultData(result);
      expect(data.summary).toEqual({
        total: 1,
        installed: 0,
        already_installed: 0,
        not_found: 1,
        failed: 0,
      });
      expect(data.not_found_rule_ids).toEqual(['nonexistent-rule']);
    });

    it('handles mixed results (install, skip, not found)', async () => {
      const ruleAsset1 = createMockRuleAsset('rule-1', 'Rule 1');
      const ruleAsset2 = createMockRuleAsset('rule-2', 'Rule 2');
      mockFetchLatestAssets.mockResolvedValue([ruleAsset1, ruleAsset2]);
      mockFetchInstalledRuleVersions.mockResolvedValue([
        { rule_id: 'rule-2', version: 1, id: 'obj-2', tags: [] },
      ]);
      mockCreatePrebuiltRules.mockResolvedValue({
        results: [{ result: createMockRuleResponse('rule-1', 'Rule 1') }],
        errors: [],
      });

      const result = await tool.handler(
        { rule_ids: ['rule-1', 'rule-2', 'rule-3'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const data = getResultData(result);
      expect(data.summary).toEqual({
        total: 3,
        installed: 1,
        already_installed: 1,
        not_found: 1,
        failed: 0,
      });
    });

    it('reports failed rules', async () => {
      const ruleAsset = createMockRuleAsset('rule-1', 'Test Rule 1');
      mockFetchLatestAssets.mockResolvedValue([ruleAsset]);
      mockFetchInstalledRuleVersions.mockResolvedValue([]);
      mockCreatePrebuiltRules.mockResolvedValue({
        results: [],
        errors: [{ item: ruleAsset, error: new Error('ML validation failed') }],
      });

      const result = await tool.handler(
        { rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const data = getResultData(result);
      expect(data.summary).toEqual({
        total: 1,
        installed: 0,
        already_installed: 0,
        not_found: 0,
        failed: 1,
      });
      expect(data.failed_rules).toEqual([{ rule_id: 'rule-1', error: 'ML validation failed' }]);
    });

    it('returns error result on unexpected failure', async () => {
      mockFetchLatestAssets.mockRejectedValue(new Error('Saved objects unavailable'));

      const result = await tool.handler(
        { rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const standardResult = result as ToolHandlerStandardReturn;
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      const data = getResultData(result);
      expect(data.message).toContain('Saved objects unavailable');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('passes correct arguments to createPrebuiltRules', async () => {
      const ruleAsset = createMockRuleAsset('rule-1', 'Test Rule 1');
      mockFetchLatestAssets.mockResolvedValue([ruleAsset]);
      mockFetchInstalledRuleVersions.mockResolvedValue([]);
      mockCreatePrebuiltRules.mockResolvedValue({ results: [], errors: [] });

      await tool.handler(
        { rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockCreatePrebuiltRules).toHaveBeenCalledWith(
        mockDetectionRulesClient,
        [ruleAsset],
        mockLogger
      );
    });

    it('constructs detection rules client with correct dependencies', async () => {
      mockFetchLatestAssets.mockResolvedValue([]);
      mockFetchInstalledRuleVersions.mockResolvedValue([]);
      mockCreatePrebuiltRules.mockResolvedValue({ results: [], errors: [] });

      await tool.handler(
        { rule_ids: ['rule-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockCreateDetectionRulesClient).toHaveBeenCalledWith({
        actionsClient: mockActionsClient,
        rulesClient: mockRulesClient,
        savedObjectsClient: expect.anything(),
        mlAuthz: mockMlAuthz,
        rulesAuthz: mockRulesAuthz,
        productFeaturesService: mockProductFeaturesService,
        license: expect.objectContaining({ isActive: true }),
      });
    });
  });
});
