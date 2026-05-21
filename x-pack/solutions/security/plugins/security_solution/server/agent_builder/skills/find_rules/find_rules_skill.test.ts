/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { createFindRulesSkill } from './find_rules_skill';
import { FIND_RULES_INLINE_TOOL_ID, findRulesSchema } from './find_rules_tool';
import {
  DISCOVER_RULE_TAGS_INLINE_TOOL_ID,
  discoverRuleTagsSchema,
} from './discover_rule_tags_tool';
import { buildFullFilter } from './rule_filter';

const createMockDeps = () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const findMock = jest.fn();
  const aggregateMock = jest.fn();

  const mockCoreStart = setupMockCoreStartServices(mockCore, mockEsClient);
  mockCore.getStartServices.mockResolvedValue([
    mockCoreStart,
    {
      alerting: {
        getRulesClientWithRequest: jest.fn().mockResolvedValue({
          find: findMock,
          aggregate: aggregateMock,
        }),
      },
    },
    {},
  ] as never);

  return {
    getStartServices: mockCore.getStartServices,
    mockLogger,
    mockEsClient,
    mockRequest,
    findMock,
    aggregateMock,
  };
};

describe('findRulesSkill', () => {
  it('has stable metadata', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.id).toBe('find-rules');
    expect(skill.name).toBe('find-rules');
    expect(skill.basePath).toBe('skills/security/rules');
    expect(skill.description).toContain('detection rules');
  });

  it('exposes the alerts tool as a registry tool', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    const tools = skill.getRegistryTools?.() ?? [];
    expect(tools).toEqual([SECURITY_ALERTS_TOOL_ID]);
  });

  it('exposes two inline tools: find_rules and discover_rule_tags', async () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    const inlineTools = await skill.getInlineTools!();
    expect(inlineTools).toHaveLength(2);
    const ids = inlineTools.map((t) => t.id);
    expect(ids).toContain(FIND_RULES_INLINE_TOOL_ID);
    expect(ids).toContain(DISCOVER_RULE_TAGS_INLINE_TOOL_ID);
  });

  it('stays within the Agent Builder per-skill tool-count guideline (<= 7)', async () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    const registryTools = (await skill.getRegistryTools?.()) ?? [];
    const inlineTools = await skill.getInlineTools!();
    expect(registryTools.length + inlineTools.length).toBeLessThanOrEqual(7);
  });

  it('content includes the negative-routing guidance for sibling skills', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/alert-analysis/);
    expect(skill.content).toMatch(/detection-rule-edit/);
    expect(skill.content).toMatch(/threat-hunting/);
    expect(skill.content).toMatch(/rule-management/);
  });

  it('content advertises the read-only action limitations', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/Read-Only/i);
    expect(skill.content).toMatch(/cannot enable, disable, delete, duplicate, or bulk-edit/i);
    expect(skill.content).toMatch(/Detection Rules UI/i);
    expect(skill.content).toMatch(/single rule attachment/i);
  });

  it('content enforces hallucination guards', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/Grounding/i);
    expect(skill.content).toMatch(/must come from a tool result/i);
  });

  it('content teaches discover-then-filter for tags via security.discover_rule_tags', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toContain('security.discover_rule_tags');
    expect(skill.content).toMatch(/Tag Discovery/i);
    expect(skill.content).toMatch(/structured MITRE IDs/i);
  });

  it('content documents the two-tool split with a tool table', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toContain('security.find_rules');
    expect(skill.content).toContain('security.discover_rule_tags');
    expect(skill.content).toMatch(/Default to.*security\.find_rules/);
  });

  it('content routes simple count questions through find_rules totals', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/simple count questions/i);
    expect(skill.content).toMatch(/answer from `total`/);
    expect(skill.content).toContain('How many enabled vs disabled?');
  });

  it('content teaches the array-of-arrays filter shape (outer=OR, inner=AND)', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/outer array = OR/);
    expect(skill.content).toMatch(/inner array = AND/);
    expect(skill.content).toMatch(/one atomic fact/);
    expect(skill.content).toContain('[[{ severity: "critical" }, { tag: "MITRE" }]]');
    expect(skill.content).toContain('exclude: [[{ tag: "Custom" }]]');
  });

  it('content requires tag discovery before tag filtering', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/Before filtering by tag/i);
    expect(skill.content).toMatch(/exact tag values/i);
    expect(skill.content).toContain('security.find_rules');
  });

  it('content teaches UUID translation for the noisy-rules flow', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/kibana\.alert\.rule\.uuid/);
    expect(skill.content).toContain('{ ruleUuid:');
    expect(skill.content).toMatch(/NOT.*kibana\.alert\.rule\.name/i);
  });
});
describe('findRulesSchema', () => {
  it('accepts filter-only queries', () => {
    expect(findRulesSchema.safeParse({ filter: [[{ severity: 'critical' }]] }).success).toBe(true);
  });

  it('does not accept tagDiscovery or countBy (those live on separate tools)', () => {
    expect(findRulesSchema.safeParse({ tagDiscovery: true }).success).toBe(false);
    expect(findRulesSchema.safeParse({ countBy: 'enabled' }).success).toBe(false);
    expect(findRulesSchema.safeParse({ groupBy: 'tags' }).success).toBe(false);
  });
});
describe('discoverRuleTagsSchema', () => {
  it('accepts an empty call (discover all tags)', () => {
    expect(discoverRuleTagsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a filter to scope discovery', () => {
    expect(discoverRuleTagsSchema.safeParse({ filter: [[{ severity: 'critical' }]] }).success).toBe(
      true
    );
  });

  it('rejects unknown parameters', () => {
    expect(discoverRuleTagsSchema.safeParse({ perPage: 10 }).success).toBe(false);
    expect(discoverRuleTagsSchema.safeParse({ tagDiscovery: true }).success).toBe(false);
  });
});

describe('buildFullFilter', () => {
  describe('empty input', () => {
    it('returns undefined when both filter and exclude are absent', () => {
      expect(buildFullFilter(undefined, undefined)).toBeUndefined();
      expect(buildFullFilter([], [])).toBeUndefined();
    });
  });

  describe('single AndGroup, single atomic condition', () => {
    it('builds enabled clause', () => {
      expect(buildFullFilter([[{ enabled: true }]], undefined)).toBe(
        'alert.attributes.enabled: true'
      );
      expect(buildFullFilter([[{ enabled: false }]], undefined)).toBe(
        'alert.attributes.enabled: false'
      );
    });

    it('builds ruleSource clause', () => {
      expect(buildFullFilter([[{ ruleSource: 'custom' }]], undefined)).toBe(
        'alert.attributes.params.immutable: false'
      );
      expect(buildFullFilter([[{ ruleSource: 'prebuilt' }]], undefined)).toBe(
        'alert.attributes.params.immutable: true'
      );
    });

    it('builds severity clause', () => {
      expect(buildFullFilter([[{ severity: 'critical' }]], undefined)).toBe(
        'alert.attributes.params.severity: "critical"'
      );
    });

    it('builds ruleType clause', () => {
      expect(buildFullFilter([[{ ruleType: 'query' }]], undefined)).toBe(
        'alert.attributes.params.type: ("query")'
      );
      expect(buildFullFilter([[{ ruleType: 'saved_query' }]], undefined)).toBe(
        'alert.attributes.params.type: ("saved_query")'
      );
    });

    it('builds tag clause', () => {
      expect(buildFullFilter([[{ tag: 'MITRE' }]], undefined)).toBe(
        'alert.attributes.tags:("MITRE")'
      );
    });

    it('builds riskScoreMin clause', () => {
      expect(buildFullFilter([[{ riskScoreMin: 70 }]], undefined)).toBe(
        'alert.attributes.params.risk_score >= 70'
      );
    });

    it('builds mitreTechnique clause', () => {
      expect(buildFullFilter([[{ mitreTechnique: 'T1059' }]], undefined)).toBe(
        'alert.attributes.params.threat.technique.id: "T1059"'
      );
      expect(buildFullFilter([[{ mitreTechnique: 'T1059.001' }]], undefined)).toBe(
        'alert.attributes.params.threat.technique.subtechnique.id: "T1059.001"'
      );
    });

    it('builds ruleUuid clause', () => {
      expect(
        buildFullFilter([[{ ruleUuid: '57fc3dd0-4383-4396-98e7-2bbfe6cde41f' }]], undefined)
      ).toBe('alert.id: "alert:57fc3dd0-4383-4396-98e7-2bbfe6cde41f"');
    });

    it('builds nameContains: single-term uses wildcard on .keyword (UI parity)', () => {
      expect(buildFullFilter([[{ nameContains: 'PowerShell' }]], undefined)).toBe(
        'alert.attributes.name.keyword: *PowerShell*'
      );
    });

    it('builds nameContains: multi-term uses exact phrase on .name (UI parity)', () => {
      expect(buildFullFilter([[{ nameContains: 'PowerShell Encoded' }]], undefined)).toBe(
        'alert.attributes.name: "PowerShell Encoded"'
      );
    });
  });

  describe('AND within an AndGroup (multiple atomic conditions)', () => {
    it('joins two conditions with AND', () => {
      expect(buildFullFilter([[{ enabled: true }, { severity: 'critical' }]], undefined)).toBe(
        'alert.attributes.enabled: true AND alert.attributes.params.severity: "critical"'
      );
    });

    it('expresses "tagged MITRE AND tagged Custom" — the key new capability', () => {
      expect(buildFullFilter([[{ tag: 'MITRE' }, { tag: 'Custom' }]], undefined)).toBe(
        'alert.attributes.tags:("MITRE") AND alert.attributes.tags:("Custom")'
      );
    });

  });

  describe('multiple AndGroups (OR between groups)', () => {
    it('joins two AndGroups with OR and parenthesizes each', () => {
      expect(
        buildFullFilter(
          [
            [{ severity: 'critical' }, { tag: 'MITRE' }],
            [{ severity: 'high' }, { tag: 'Custom' }],
          ],
          undefined
        )
      ).toBe(
        '(alert.attributes.params.severity: "critical" AND alert.attributes.tags:("MITRE")) OR ' +
          '(alert.attributes.params.severity: "high" AND alert.attributes.tags:("Custom"))'
      );
    });

    it('expresses "critical OR high severity" via two single-condition groups', () => {
      expect(buildFullFilter([[{ severity: 'critical' }], [{ severity: 'high' }]], undefined)).toBe(
        '(alert.attributes.params.severity: "critical") OR ' +
          '(alert.attributes.params.severity: "high")'
      );
    });
  });

  describe('exclude', () => {
    it('wraps a single exclude AndGroup in NOT', () => {
      expect(buildFullFilter(undefined, [[{ tag: 'Custom' }]])).toBe(
        'NOT (alert.attributes.tags:("Custom"))'
      );
    });

    it('combines filter + exclude with AND NOT', () => {
      expect(buildFullFilter([[{ tag: 'MITRE' }]], [[{ tag: 'Custom' }]])).toBe(
        '(alert.attributes.tags:("MITRE")) AND NOT (alert.attributes.tags:("Custom"))'
      );
    });
  });

  describe('KQL escaping', () => {
    it('escapes special characters in nameContains', () => {
      expect(buildFullFilter([[{ nameContains: 'a"b' }]], undefined)).toBe(
        'alert.attributes.name.keyword: *a\\"b*'
      );
    });

    it('escapes special characters in a tag', () => {
      expect(buildFullFilter([[{ tag: 'tag:with:colons' }]], undefined)).toBe(
        'alert.attributes.tags:("tag:with:colons")'
      );
    });

    it('escapes parentheses and quotes', () => {
      expect(buildFullFilter([[{ tag: '(weird "tag")' }]], undefined)).toBe(
        'alert.attributes.tags:("(weird \\"tag\\")")'
      );
    });
  });
});

describe('findRules inline tool handler', () => {
  const setup = async () => {
    const deps = createMockDeps();
    const skill = createFindRulesSkill({
      getStartServices: deps.getStartServices,
      logger: deps.mockLogger,
    });
    const inlineTools = await skill.getInlineTools!();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolDef = inlineTools.find((t) => t.id === FIND_RULES_INLINE_TOOL_ID) as any;
    return { ...deps, toolDef };
  };

  it('registers under the security.find_rules ID', async () => {
    const { toolDef } = await setup();
    expect(toolDef.id).toBe(FIND_RULES_INLINE_TOOL_ID);
  });

  it('passes a structured filter through as KQL to rulesClient.find', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 1, data: [] });
    const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

    await toolDef.handler({ filter: [[{ enabled: true }, { severity: 'critical' }]] }, ctx);

    expect(findMock).toHaveBeenCalledTimes(1);
    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toContain(
      '(alert.attributes.enabled: true AND alert.attributes.params.severity: "critical")'
    );
    expect(args.options.filter).toContain('alert.attributes.alertTypeId: siem.queryRule');
  });

  it('plumbs a ruleUuid condition through to rulesClient.find as canonical SO-UUID filter and returns the matched rule', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    const ruleUuid = '57fc3dd0-4383-4396-98e7-2bbfe6cde41f';
    const fakeRule = {
      id: ruleUuid,
      name: 'Suspicious PowerShell Execution',
      tags: ['MITRE'],
      enabled: true,
      alertTypeId: 'siem.queryRule',
      params: { rule_id: 'rl-static-12345', severity: 'critical', risk_score: 99, type: 'query' },
      updatedAt: '2026-01-01T00:00:00Z',
    };
    findMock.mockResolvedValue({ total: 1, data: [fakeRule] });

    const result = await toolDef.handler(
      { filter: [[{ ruleUuid }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(findMock).toHaveBeenCalledTimes(1);
    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toContain(`alert.id: "alert:${ruleUuid}"`);
    expect(args.options.filter).toContain('alert.attributes.alertTypeId: siem.queryRule');

    const data = result.results[0].data as {
      total: number;
      rules: Array<{ id: string; ruleId: unknown; name: string }>;
    };
    expect(data.total).toBe(1);
    expect(data.rules[0]).toMatchObject({
      id: fakeRule.id,
      ruleId: 'rl-static-12345',
      name: fakeRule.name,
    });
  });

  it('handles camelCase params from the Alerting framework (real Detection Engine storage)', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    const fakeRule = {
      id: 'camel-case-rule-uuid',
      name: 'CamelCase Params Rule',
      tags: ['test'],
      enabled: true,
      alertTypeId: 'siem.queryRule',
      params: { ruleId: 'rl-camel', severity: 'high', riskScore: 75, type: 'query' },
      updatedAt: '2026-01-01T00:00:00Z',
    };
    findMock.mockResolvedValue({ total: 1, data: [fakeRule] });

    const result = await toolDef.handler(
      { filter: [[{ enabled: true }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const data = result.results[0].data as {
      total: number;
      rules: Array<{ ruleId: unknown; riskScore: unknown }>;
    };
    expect(data.rules[0].ruleId).toBe('rl-camel');
    expect(data.rules[0].riskScore).toBe(75);
  });

  it('supports OR-of-AND-groups of ruleUuid conditions (multi-rule translation)', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const uuidA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const uuidB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await toolDef.handler(
      { filter: [[{ ruleUuid: uuidA }], [{ ruleUuid: uuidB }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toContain(
      `(alert.id: "alert:${uuidA}") OR (alert.id: "alert:${uuidB}")`
    );
  });

  it('maps severity sortField to params.severity', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    await toolDef.handler(
      { sortField: 'severity', sortOrder: 'desc', perPage: 5 },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const args = findMock.mock.calls[0][0];
    expect(args.options.sortField).toBe('params.severity');
    expect(args.options.sortOrder).toBe('desc');
    expect(args.options.perPage).toBe(5);
  });

  it('maps risk_score sortField to params.risk_score', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    await toolDef.handler(
      { sortField: 'risk_score', sortOrder: 'desc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(findMock.mock.calls[0][0].options.sortField).toBe('params.risk_score');
  });

  it('returns an error result when rulesClient.find throws', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockRejectedValue(new Error('boom'));

    const result = await toolDef.handler(
      { filter: [[{ enabled: true }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('boom');
  });

  it('hints at security.discover_rule_tags when zero results and the filter used a tag condition', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const result = await toolDef.handler(
      { filter: [[{ tag: 'Network Security' }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const message = (result.results[0].data as { message: string }).message;
    expect(message).toContain('No detection rules matched');
    expect(message).toContain('security.discover_rule_tags');
    expect(message).toContain('may not exist');
  });

  it('hints at general exploration when zero results without a tag condition', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const result = await toolDef.handler(
      { filter: [[{ severity: 'critical' }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const message = (result.results[0].data as { message: string }).message;
    expect(message).toContain('No detection rules matched');
    expect(message).toContain('broadening the filter');
  });
});

describe('discoverRuleTags inline tool handler', () => {
  const setup = async () => {
    const deps = createMockDeps();
    const skill = createFindRulesSkill({
      getStartServices: deps.getStartServices,
      logger: deps.mockLogger,
    });
    const inlineTools = await skill.getInlineTools!();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolDef = inlineTools.find((t) => t.id === DISCOVER_RULE_TAGS_INLINE_TOOL_ID) as any;
    return { ...deps, toolDef };
  };

  it('registers under the security.discover_rule_tags ID', async () => {
    const { toolDef } = await setup();
    expect(toolDef.id).toBe(DISCOVER_RULE_TAGS_INLINE_TOOL_ID);
  });

  it('uses findRules aggregations for tag discovery, with a 500-bucket size cap', async () => {
    const { toolDef, findMock, aggregateMock, mockEsClient, mockLogger, mockRequest } =
      await setup();
    findMock.mockResolvedValue({
      total: 0,
      data: [],
      aggregations: { by_field: { buckets: [{ key: 'MITRE', doc_count: 3 }] } },
    });

    const result = await toolDef.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(aggregateMock).not.toHaveBeenCalled();
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(findMock.mock.calls[0][0].options.filter).toContain(
      'alert.attributes.alertTypeId: siem.queryRule'
    );
    expect(findMock.mock.calls[0][0].options.perPage).toBe(0);
    expect(findMock.mock.calls[0][0].options.page).toBe(1);
    expect(findMock.mock.calls[0][0].options.aggs.by_field.terms.field).toBe(
      'alert.attributes.tags'
    );
    expect(findMock.mock.calls[0][0].options.aggs.by_field.terms.size).toBe(500);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data.mode).toBe('tag_discovery');
    expect(result.results[0].data.groups).toEqual([{ value: 'MITRE', count: 3 }]);
    expect(result.results[0].data.truncated).toBe(false);
  });

  it('flags truncation and surfaces sum_other_doc_count when the agg cap is hit', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({
      total: 0,
      data: [],
      aggregations: {
        by_field: {
          buckets: [{ key: 'MITRE', doc_count: 12 }],
          sum_other_doc_count: 47,
        },
      },
    });

    const result = await toolDef.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const data = result.results[0].data as {
      message: string;
      truncated: boolean;
      otherDocCount: number;
    };
    expect(data.truncated).toBe(true);
    expect(data.otherDocCount).toBe(47);
    expect(data.message).toContain('additional groups beyond');
    expect(data.message).toContain('sum_other_doc_count=47');
  });

  it('applies filter to scope tag discovery', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({
      total: 0,
      data: [],
      aggregations: { by_field: { buckets: [] } },
    });

    await toolDef.handler(
      { filter: [[{ severity: 'critical' }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(findMock.mock.calls[0][0].options.filter).toContain(
      'alert.attributes.params.severity: "critical"'
    );
  });

  it('returns an error result when rulesClient.find throws', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockRejectedValue(new Error('tag boom'));

    const result = await toolDef.handler(
      {},
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('tag boom');
  });
});
