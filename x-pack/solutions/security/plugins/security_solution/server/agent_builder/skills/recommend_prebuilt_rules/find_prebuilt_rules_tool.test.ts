/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import {
  FIND_PREBUILT_RULES_INLINE_TOOL_ID,
  buildPrebuiltRulesToolFilter,
  createFindPrebuiltRulesInlineTool,
  findPrebuiltRulesSchema,
  summarizeForTriage,
} from './find_prebuilt_rules_tool';
import { createPrebuiltRuleAssetsClient } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { getInstallableRulesForReview } from '../../../lib/detection_engine/prebuilt_rules/logic/get_installable_rules_for_review';
import type { RuleResponse } from '../../../../common/api/detection_engine';

jest.mock(
  '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client',
  () => ({ createPrebuiltRuleAssetsClient: jest.fn() })
);
jest.mock(
  '../../../lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client',
  () => ({ createPrebuiltRuleObjectsClient: jest.fn() })
);
jest.mock(
  '../../../lib/detection_engine/prebuilt_rules/logic/get_installable_rules_for_review',
  () => ({ getInstallableRulesForReview: jest.fn() })
);

const mockCreatePrebuiltRuleAssetsClient = jest.mocked(createPrebuiltRuleAssetsClient);
const mockCreatePrebuiltRuleObjectsClient = jest.mocked(createPrebuiltRuleObjectsClient);
const mockGetInstallableRulesForReview = jest.mocked(getInstallableRulesForReview);

const makeRule = (overrides: Partial<RuleResponse> = {}): RuleResponse =>
  ({
    rule_id: 'rule-1',
    name: 'Test Rule',
    severity: 'high',
    risk_score: 73,
    tags: ['OS: Windows'],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://example' },
        technique: [
          { id: 'T1059', name: 'Command and Scripting Interpreter', reference: 'https://example' },
        ],
      },
    ],
    related_integrations: [{ package: 'windows', version: '^1.0.0' }],
    ...overrides,
  } as RuleResponse);

const createMockDeps = ({ activeSpaceId }: { activeSpaceId?: string } = {}) => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);

  mockCoreStart.savedObjects.getScopedClient = jest.fn().mockReturnValue({});

  const alertingPlugin = {
    getRulesClientWithRequest: jest.fn().mockResolvedValue({}),
  };
  // Only wire the spaces plugin when a space id is requested; otherwise leave it absent to
  // exercise the optional-chaining path (empty prefix when spaces is unavailable).
  const startPlugins: Record<string, unknown> = { alerting: alertingPlugin };
  if (activeSpaceId !== undefined) {
    startPlugins.spaces = {
      spacesService: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: activeSpaceId }),
      },
    };
  }
  mockCore.getStartServices.mockResolvedValue([mockCoreStart, startPlugins, {}] as never);

  mockCreatePrebuiltRuleAssetsClient.mockReturnValue({
    fetchLatestAssets: jest.fn(),
    fetchLatestVersions: jest.fn(),
    fetchAssetsByVersion: jest.fn(),
    fetchTagsByVersion: jest.fn(),
    fetchDeprecatedRules: jest.fn(),
  });
  mockCreatePrebuiltRuleObjectsClient.mockReturnValue({
    fetchInstalledRulesByIds: jest.fn(),
    fetchInstalledRules: jest.fn(),
    fetchInstalledRuleVersionsByIds: jest.fn(),
    fetchInstalledRuleVersions: jest.fn().mockResolvedValue([]),
  });

  return {
    getStartServices: mockCore.getStartServices,
    mockLogger,
    mockEsClient,
    mockRequest,
  };
};

describe('buildPrebuiltRulesToolFilter', () => {
  it('returns undefined when no parameters are provided', () => {
    expect(buildPrebuiltRulesToolFilter({})).toBeUndefined();
  });

  it('builds a single-token searchTerm clause over name and description', () => {
    expect(buildPrebuiltRulesToolFilter({ searchTerm: 'mimikatz' })).toBe(
      '(security-rule.name: mimikatz OR security-rule.description: mimikatz)'
    );
  });

  it('ANDs multi-token searchTerm within each field', () => {
    expect(buildPrebuiltRulesToolFilter({ searchTerm: 'lsass memory' })).toBe(
      '(security-rule.name: (lsass AND memory) OR security-rule.description: (lsass AND memory))'
    );
  });

  it('builds severity clause (single)', () => {
    expect(buildPrebuiltRulesToolFilter({ severity: ['critical'] })).toBe(
      'security-rule.severity: (critical)'
    );
  });

  it('builds severity clause with OR for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ severity: ['critical', 'high'] })).toBe(
      'security-rule.severity: (critical OR high)'
    );
  });

  it('builds ruleType clause with OR for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ ruleType: ['esql', 'eql'] })).toBe(
      'security-rule.type: (esql OR eql)'
    );
  });

  it('builds tags clause (single)', () => {
    expect(buildPrebuiltRulesToolFilter({ tags: ['OS: Windows'] })).toBe(
      'security-rule.tags: "OS: Windows"'
    );
  });

  it('builds tags clause with OR for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ tags: ['OS: Windows', 'Domain: LLM'] })).toBe(
      '(security-rule.tags: "OS: Windows" OR security-rule.tags: "Domain: LLM")'
    );
  });

  it('builds excludeTags clause (single)', () => {
    expect(buildPrebuiltRulesToolFilter({ excludeTags: ['Custom'] })).toBe(
      'NOT security-rule.tags: "Custom"'
    );
  });

  it('builds excludeTags clause with AND for multiple values', () => {
    expect(buildPrebuiltRulesToolFilter({ excludeTags: ['A', 'B'] })).toBe(
      'NOT security-rule.tags: "A" AND NOT security-rule.tags: "B"'
    );
  });

  it('routes a single mitreTechnique to the technique id field', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTechnique: ['T1059'] })).toBe(
      'security-rule.threat.technique.id: (T1059)'
    );
  });

  it('routes a single sub-technique to the subtechnique id field', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTechnique: ['T1059.001'] })).toBe(
      'security-rule.threat.technique.subtechnique.id: (T1059.001)'
    );
  });

  it('ORs techniques and sub-techniques across their respective fields', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTechnique: ['T1059', 'T1071', 'T1059.001'] })).toBe(
      '(security-rule.threat.technique.id: (T1059 OR T1071) OR security-rule.threat.technique.subtechnique.id: (T1059.001))'
    );
  });

  it('routes a single tactic ID to threat.tactic.id', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['TA0001'] })).toBe(
      'security-rule.threat.tactic.id: (TA0001)'
    );
  });

  it('routes a single tactic display name to threat.tactic.name', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['Initial Access'] })).toBe(
      'security-rule.threat.tactic.name: ("Initial Access")'
    );
  });

  it('ORs multiple tactic IDs in one clause', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['TA0001', 'TA0006'] })).toBe(
      'security-rule.threat.tactic.id: (TA0001 OR TA0006)'
    );
  });

  it('ORs tactic IDs and names across their respective fields', () => {
    expect(buildPrebuiltRulesToolFilter({ mitreTactic: ['TA0001', 'Credential Access'] })).toBe(
      '(security-rule.threat.tactic.id: (TA0001) OR security-rule.threat.tactic.name: ("Credential Access"))'
    );
  });

  it('builds relatedIntegrations clause with quoted packages', () => {
    expect(buildPrebuiltRulesToolFilter({ relatedIntegrations: ['okta', 'aws'] })).toBe(
      'security-rule.related_integrations.package: ("okta" OR "aws")'
    );
  });

  it('builds ruleIds clause with quoted ids', () => {
    expect(buildPrebuiltRulesToolFilter({ ruleIds: ['abc-123', 'def-456'] })).toBe(
      'security-rule.rule_id: ("abc-123" OR "def-456")'
    );
  });

  it('ANDs multiple parameters together', () => {
    const result = buildPrebuiltRulesToolFilter({ severity: ['critical'], ruleType: ['esql'] });
    expect(result).toBe('security-rule.severity: (critical) AND security-rule.type: (esql)');
  });

  it('treats an empty array the same as an omitted parameter (no clause)', () => {
    expect(buildPrebuiltRulesToolFilter({ tags: [], severity: [] })).toBeUndefined();
  });
});

describe('summarizeForTriage', () => {
  it('trims to the triage shape with MITRE tactics and integration packages only', () => {
    const result = summarizeForTriage(makeRule());
    expect(result).toEqual({
      rule_id: 'rule-1',
      name: 'Test Rule',
      severity: 'high',
      risk_score: 73,
      tags: ['OS: Windows'],
      mitre: [{ tactic: { id: 'TA0001', name: 'Initial Access' } }],
      related_integrations: [{ package: 'windows' }],
    });
  });

  it('codes defensively for rules with empty threat and related_integrations', () => {
    const result = summarizeForTriage(
      makeRule({ threat: undefined, related_integrations: undefined, tags: undefined })
    );
    expect(result.mitre).toEqual([]);
    expect(result.related_integrations).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});

describe('findPrebuiltRulesSchema', () => {
  it('accepts structured filter parameters', () => {
    expect(findPrebuiltRulesSchema.safeParse({ searchTerm: 'mimikatz' }).success).toBe(true);
    expect(findPrebuiltRulesSchema.safeParse({ ruleType: ['esql'] }).success).toBe(true);
    expect(
      findPrebuiltRulesSchema.safeParse({ mitreTactic: ['TA0001', 'Execution'] }).success
    ).toBe(true);
    expect(
      findPrebuiltRulesSchema.safeParse({ mitreTechnique: ['T1059', 'T1059.001'] }).success
    ).toBe(true);
    expect(findPrebuiltRulesSchema.safeParse({ fields: ['description', 'mitre'] }).success).toBe(
      true
    );
  });

  it('rejects unknown parameters', () => {
    expect(findPrebuiltRulesSchema.safeParse({ ruleSource: 'prebuilt' }).success).toBe(false);
    expect(findPrebuiltRulesSchema.safeParse({ enabled: true }).success).toBe(false);
  });

  it('rejects malformed MITRE technique IDs', () => {
    expect(findPrebuiltRulesSchema.safeParse({ mitreTechnique: ['TA0001'] }).success).toBe(false);
    expect(findPrebuiltRulesSchema.safeParse({ mitreTechnique: ['powershell'] }).success).toBe(
      false
    );
    // A non-array value is no longer accepted.
    expect(findPrebuiltRulesSchema.safeParse({ mitreTechnique: 'T1059' }).success).toBe(false);
  });

  it('caps ruleIds at 50', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id-${i}`);
    expect(findPrebuiltRulesSchema.safeParse({ ruleIds: ids }).success).toBe(false);
  });

  it('defaults perPage to 10 and sortOrder to desc', () => {
    const parsed = findPrebuiltRulesSchema.parse({});
    expect(parsed.perPage).toBe(10);
    expect(parsed.sortOrder).toBe('desc');
  });
});

describe('createFindPrebuiltRulesInlineTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id and type', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const tool = createFindPrebuiltRulesInlineTool({ getStartServices, logger: mockLogger });
    expect(tool.id).toBe(FIND_PREBUILT_RULES_INLINE_TOOL_ID);
    expect(tool.id).toBe('security.find_prebuilt_rules');
    expect(tool.type).toBe(ToolType.builtin);
  });

  describe('handler', () => {
    const runHandler = async (
      input: Record<string, unknown>,
      result: { rules: RuleResponse[]; total: number },
      opts: { activeSpaceId?: string } = {}
    ) => {
      const { getStartServices, mockLogger, mockEsClient, mockRequest } = createMockDeps(opts);
      mockGetInstallableRulesForReview.mockResolvedValue(result);
      const tool = createFindPrebuiltRulesInlineTool({ getStartServices, logger: mockLogger });
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);
      // Parse through the schema so zod defaults (perPage, sortOrder) are applied, exactly
      // as the Agent Builder framework does before invoking the handler in production.
      const validatedInput = findPrebuiltRulesSchema.parse(input);
      const toolResult = await tool.handler(validatedInput, context);
      return { toolResult, mockLogger };
    };

    it('passes no KQL filter and the default triage projection for an empty call', async () => {
      await runHandler({}, { rules: [], total: 0 });

      expect(mockGetInstallableRulesForReview).toHaveBeenCalledTimes(1);
      const args = mockGetInstallableRulesForReview.mock.calls[0][0];
      expect(args.filter).toBeUndefined();
      expect(args.page).toBe(1);
      expect(args.perPage).toBe(10);
      expect(args.sort).toBeUndefined();
      expect(args.fields).toEqual([
        'severity',
        'risk_score',
        'tags',
        'threat',
        'related_integrations',
      ]);
    });

    it('translates structured params into a single KQL filter', async () => {
      await runHandler({ searchTerm: 'mimikatz', severity: ['critical'] }, { rules: [], total: 0 });
      const args = mockGetInstallableRulesForReview.mock.calls[0][0];
      expect(args.filter).toBe(
        '(security-rule.name: mimikatz OR security-rule.description: mimikatz) AND security-rule.severity: (critical)'
      );
    });

    it('maps sortField/sortOrder to the prebuilt-asset sort shape', async () => {
      await runHandler(
        { sortField: 'risk_score', sortOrder: 'asc', perPage: 5 },
        { rules: [], total: 0 }
      );
      const args = mockGetInstallableRulesForReview.mock.calls[0][0];
      expect(args.sort).toEqual([{ field: 'risk_score', order: 'asc' }]);
      expect(args.perPage).toBe(5);
    });

    it('returns the trimmed triage shape and includes related_integrations.package', async () => {
      const { toolResult } = await runHandler({}, { rules: [makeRule()], total: 1 });
      expect('results' in toolResult).toBe(true);
      if ('results' in toolResult) {
        const data = toolResult.results[0].data as {
          total: number;
          rules: Array<{ related_integrations: Array<{ package: string }>; mitre: unknown[] }>;
        };
        expect(toolResult.results[0].type).toBe(ToolResultType.other);
        expect(data.total).toBe(1);
        expect(data.rules[0].related_integrations).toEqual([{ package: 'windows' }]);
        expect(data.rules[0].mitre).toEqual([{ tactic: { id: 'TA0001', name: 'Initial Access' } }]);
        // Triage shape should not carry deep fields.
        expect(data.rules[0]).not.toHaveProperty('description');
      }
    });

    it('returns an empty space_url_prefix when the spaces plugin is unavailable', async () => {
      const { toolResult } = await runHandler({}, { rules: [makeRule()], total: 1 });
      if ('results' in toolResult) {
        const { space_url_prefix: spaceUrlPrefix } = toolResult.results[0].data as {
          space_url_prefix: string;
        };
        expect(spaceUrlPrefix).toBe('');
      }
    });

    it('returns an empty space_url_prefix in the default space', async () => {
      const { toolResult } = await runHandler(
        {},
        { rules: [makeRule()], total: 1 },
        { activeSpaceId: 'default' }
      );
      if ('results' in toolResult) {
        const { space_url_prefix: spaceUrlPrefix } = toolResult.results[0].data as {
          space_url_prefix: string;
        };
        expect(spaceUrlPrefix).toBe('');
      }
    });

    it('prefixes space_url_prefix with /s/<id> in a custom space', async () => {
      const { toolResult } = await runHandler(
        {},
        { rules: [makeRule()], total: 1 },
        { activeSpaceId: 'my-space' }
      );
      if ('results' in toolResult) {
        const { space_url_prefix: spaceUrlPrefix } = toolResult.results[0].data as {
          space_url_prefix: string;
        };
        expect(spaceUrlPrefix).toBe('/s/my-space');
      }
    });

    it('returns the untrimmed projected rule and widens the projection when deep fields are requested', async () => {
      const deepRule = makeRule({ description: 'Detects mimikatz' } as Partial<RuleResponse>);
      const { toolResult } = await runHandler(
        { fields: ['description', 'mitre'] },
        { rules: [deepRule], total: 1 }
      );

      const args = mockGetInstallableRulesForReview.mock.calls[0][0];
      // Triage fields are still fetched, plus the requested deep attributes (mitre -> threat).
      expect(args.fields).toEqual(
        expect.arrayContaining([
          'severity',
          'risk_score',
          'tags',
          'threat',
          'related_integrations',
          'description',
        ])
      );

      if ('results' in toolResult) {
        const data = toolResult.results[0].data as { rules: RuleResponse[] };
        // Not trimmed — the raw projected RuleResponse is returned.
        expect(data.rules[0]).toBe(deepRule);
        expect(data.rules[0].description).toBe('Detects mimikatz');
      }
    });

    it('adds a truncation hint when total exceeds the returned page', async () => {
      const { toolResult } = await runHandler({ perPage: 2 }, { rules: [makeRule()], total: 84 });
      if ('results' in toolResult) {
        const { message } = toolResult.results[0].data as { message: string };
        expect(message).toContain('Found 84 installable prebuilt rules');
        expect(message).toContain('showing top 1');
        expect(message).toContain('Narrow the filter');
      }
    });

    it('hints at catalog overview when zero results and a tag filter was used', async () => {
      const { toolResult } = await runHandler({ tags: ['Domain: LLM'] }, { rules: [], total: 0 });
      if ('results' in toolResult) {
        const { message } = toolResult.results[0].data as { message: string };
        expect(message).toContain('No installable prebuilt rules matched');
        expect(message).toContain('security.get_installable_catalog_overview');
        expect(message).toContain('may');
      }
    });

    it('hints at broadening when zero results without a tag filter', async () => {
      const { toolResult } = await runHandler({ severity: ['low'] }, { rules: [], total: 0 });
      if ('results' in toolResult) {
        const { message } = toolResult.results[0].data as { message: string };
        expect(message).toContain('No installable prebuilt rules matched');
        expect(message).toContain('broadening the filter');
      }
    });

    it('returns an error result when the backend throws', async () => {
      const { getStartServices, mockLogger, mockEsClient, mockRequest } = createMockDeps();
      mockGetInstallableRulesForReview.mockRejectedValue(new Error('ES is down'));
      const tool = createFindPrebuiltRulesInlineTool({ getStartServices, logger: mockLogger });
      const context = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

      const toolResult = await tool.handler({ perPage: 10, sortOrder: 'desc' }, context);
      if ('results' in toolResult) {
        expect(toolResult.results[0].type).toBe(ToolResultType.error);
        expect((toolResult.results[0].data as { message: string }).message).toContain('ES is down');
      }
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('ES is down'));
    });
  });
});
