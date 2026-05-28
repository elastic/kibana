/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { EXPECTED_MAX_TAGS } from '../../../lib/detection_engine/rule_management/constants';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { FIND_RULES_INLINE_TOOL_ID, buildToolFilter, findRulesSchema } from './find_rules_tool';
import {
  DISCOVER_RULE_TAGS_INLINE_TOOL_ID,
  discoverRuleTagsSchema,
} from './discover_rule_tags_tool';
import { createFindRulesSkill } from './find_rules_skill';

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
    expect(skill.id).toBe('find-security-rules');
    expect(skill.name).toBe('find-security-rules');
    expect(skill.basePath).toBe('skills/security/rules');
    expect(skill.description).toContain('detection rules');
  });

  it('uses an allow-listed built-in skill id', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(isAllowedBuiltinSkill(skill.id)).toBe(true);
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

  it('content forbids setting perPage above 10 unless the user explicitly asks', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/Never set `perPage` above 10/);
    expect(skill.content).toMatch(/explicitly states a number/);
  });

  it('content requires query filter summary before listing results', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(
      /Always.*open your reply with one sentence describing the exact filters/
    );
  });

  it('content addresses multi-turn follow-up refinement with category words', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/which of them are network/);
    expect(skill.content).toMatch(/fresh.*security\.discover_rule_tags/);
    expect(skill.content).toMatch(/carry-over filters/);
  });

  it('content teaches discover-then-filter for tags via security.discover_rule_tags', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toContain('security.discover_rule_tags');
    expect(skill.content).toMatch(/Tag Discovery/i);
  });

  it('content routes MITRE queries through structured parameters with a tactic ID map', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/MITRE ATT&CK Routing/);
    expect(skill.content).toContain('mitreTechnique');
    expect(skill.content).toContain('mitreTactic');
    expect(skill.content).toMatch(/Priority order/i);
    for (const tactic of [
      'TA0001',
      'TA0002',
      'TA0003',
      'TA0004',
      'TA0005',
      'TA0006',
      'TA0007',
      'TA0008',
      'TA0009',
      'TA0010',
      'TA0011',
      'TA0040',
      'TA0042',
      'TA0043',
    ]) {
      expect(skill.content).toContain(tactic);
    }
    for (const name of [
      'Initial Access',
      'Execution',
      'Persistence',
      'Privilege Escalation',
      'Defense Evasion',
      'Credential Access',
      'Discovery',
      'Lateral Movement',
      'Collection',
      'Exfiltration',
      'Command and Control',
      'Impact',
      'Resource Development',
      'Reconnaissance',
    ]) {
      expect(skill.content).toContain(name);
    }
    expect(skill.content).toMatch(/searchTerm/);
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

  it('content documents flat filter parameters', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/All filter parameters are flat and optional/);
    expect(skill.content).toContain('severity: ["critical", "high"]');
    expect(skill.content).toContain('excludeTags: ["Custom"]');
  });

  it('content requires tag discovery before tag filtering', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/Before filtering by tag/i);
    expect(skill.content).toMatch(/exact tag values/i);
    expect(skill.content).toMatch(/with `\{\}`/i);
    expect(skill.content).toContain('security.find_rules');
  });

  it('content teaches ruleId lookup for the noisy-rules flow', () => {
    const { getStartServices, mockLogger } = createMockDeps();
    const skill = createFindRulesSkill({ getStartServices, logger: mockLogger });
    expect(skill.content).toMatch(/kibana\.alert\.rule\.rule_id/);
    expect(skill.content).toContain('ruleId');
  });
});

describe('findRulesSchema', () => {
  it('accepts flat filter parameters', () => {
    expect(findRulesSchema.safeParse({ searchTerm: 'PowerShell' }).success).toBe(true);
    expect(findRulesSchema.safeParse({ severity: ['critical'] }).success).toBe(true);
    expect(findRulesSchema.safeParse({ enabled: true, ruleSource: 'custom' }).success).toBe(true);
    expect(findRulesSchema.safeParse({ tags: ['MITRE'], excludeTags: ['Custom'] }).success).toBe(
      true
    );
  });

  it('rejects unknown parameters', () => {
    expect(findRulesSchema.safeParse({ nameContains: 'PowerShell' }).success).toBe(false);
    expect(findRulesSchema.safeParse({ tagDiscovery: true }).success).toBe(false);
    expect(findRulesSchema.safeParse({ countBy: 'enabled' }).success).toBe(false);
    expect(findRulesSchema.safeParse({ groupBy: 'tags' }).success).toBe(false);
  });
});

describe('discoverRuleTagsSchema', () => {
  it('accepts an empty call (discover all tags)', () => {
    expect(discoverRuleTagsSchema.safeParse({}).success).toBe(true);
  });

  it('rejects all parameters (strict empty-object schema)', () => {
    expect(discoverRuleTagsSchema.safeParse({ severity: ['critical'] }).success).toBe(false);
    expect(discoverRuleTagsSchema.safeParse({ enabled: true }).success).toBe(false);
  });

  it('rejects tag parameters because discovery must enumerate available tags first', () => {
    expect(discoverRuleTagsSchema.safeParse({ tags: ['MITRE'] }).success).toBe(false);
    expect(discoverRuleTagsSchema.safeParse({ excludeTags: ['Custom'] }).success).toBe(false);
  });

  it('rejects unknown parameters', () => {
    expect(discoverRuleTagsSchema.safeParse({ perPage: 10 }).success).toBe(false);
  });
});

describe('buildToolFilter', () => {
  it('returns undefined when no parameters are provided', () => {
    expect(buildToolFilter({})).toBeUndefined();
  });

  it('builds enabled clause', () => {
    expect(buildToolFilter({ enabled: true })).toContain('alert.attributes.enabled: true');
    expect(buildToolFilter({ enabled: false })).toContain('alert.attributes.enabled: false');
  });

  it('builds ruleSource clause', () => {
    expect(buildToolFilter({ ruleSource: 'custom' })).toContain(
      'alert.attributes.params.immutable: false'
    );
    expect(buildToolFilter({ ruleSource: 'prebuilt' })).toContain(
      'alert.attributes.params.immutable: true'
    );
  });

  it('builds severity clause with single value', () => {
    expect(buildToolFilter({ severity: ['critical'] })).toContain(
      'alert.attributes.params.severity: "critical"'
    );
  });

  it('builds severity clause with OR for multiple values', () => {
    const result = buildToolFilter({ severity: ['critical', 'high'] });
    expect(result).toContain(
      '(alert.attributes.params.severity: "critical" OR alert.attributes.params.severity: "high")'
    );
  });

  it('builds ruleType clause', () => {
    expect(buildToolFilter({ ruleType: ['query'] })).toContain(
      'alert.attributes.params.type: ("query")'
    );
  });

  it('builds ruleType clause with OR for multiple values', () => {
    expect(buildToolFilter({ ruleType: ['query', 'eql'] as never })).toContain(
      'alert.attributes.params.type: ("query" OR "eql")'
    );
  });

  it('builds tags clause', () => {
    expect(buildToolFilter({ tags: ['MITRE'] })).toContain('alert.attributes.tags: "MITRE"');
  });

  it('builds tags clause with OR for multiple values', () => {
    expect(buildToolFilter({ tags: ['MITRE', 'Custom'] })).toContain(
      '(alert.attributes.tags: "MITRE" OR alert.attributes.tags: "Custom")'
    );
  });

  it('builds excludeTags clause with NOT for each tag', () => {
    const result = buildToolFilter({ excludeTags: ['Custom'] });
    expect(result).toContain('NOT alert.attributes.tags:("Custom")');
  });

  it('builds mitreTechnique clause for technique ID', () => {
    expect(buildToolFilter({ mitreTechnique: 'T1059' })).toContain(
      'alert.attributes.params.threat.technique.id: "T1059"'
    );
  });

  it('builds mitreTechnique clause for subtechnique ID', () => {
    expect(buildToolFilter({ mitreTechnique: 'T1059.001' })).toContain(
      'alert.attributes.params.threat.technique.subtechnique.id: "T1059.001"'
    );
  });

  it('builds mitreTactic clause for tactic ID', () => {
    expect(buildToolFilter({ mitreTactic: 'TA0001' })).toContain(
      'alert.attributes.params.threat.tactic.id: "TA0001"'
    );
  });

  it('builds mitreTactic clause for tactic display name', () => {
    expect(buildToolFilter({ mitreTactic: 'Initial Access' })).toContain(
      'alert.attributes.params.threat.tactic.name: "Initial Access"'
    );
  });

  it('builds ruleId clause', () => {
    expect(buildToolFilter({ ruleId: 'my-rule-id-123' })).toContain(
      'alert.attributes.params.ruleId: "my-rule-id-123"'
    );
  });

  it('builds searchTerm clause via existing search term logic', () => {
    const result = buildToolFilter({ searchTerm: 'PowerShell' });
    expect(result).toContain('alert.attributes.name.keyword: *PowerShell*');
  });

  it('ANDs multiple parameters together', () => {
    const result = buildToolFilter({ enabled: true, severity: ['critical'] });
    expect(result).toContain('alert.attributes.enabled: true');
    expect(result).toContain('alert.attributes.params.severity: "critical"');
    expect(result).toContain(' AND ');
  });

  it('combines tags with excludeTags', () => {
    const result = buildToolFilter({ tags: ['MITRE'], excludeTags: ['Custom'] });
    expect(result).toContain('alert.attributes.tags: "MITRE"');
    expect(result).toContain('NOT alert.attributes.tags:("Custom")');
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

  it('passes flat filter parameters through as KQL to rulesClient.find', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 1, data: [] });
    const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

    await toolDef.handler({ enabled: true, severity: ['critical'] }, ctx);

    expect(findMock).toHaveBeenCalledTimes(1);
    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toContain('alert.attributes.enabled: true');
    expect(args.options.filter).toContain('alert.attributes.params.severity: "critical"');
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
      { enabled: true },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const data = result.results[0].data as {
      total: number;
      rules: Array<{ ruleId: unknown; riskScore: unknown }>;
    };
    expect(data.rules[0].ruleId).toBe('rl-camel');
    expect(data.rules[0].riskScore).toBe(75);
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
      { enabled: true },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('boom');
  });

  it('explicitly tells the user results are truncated when total exceeds perPage', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    const fakeRules = Array.from({ length: 20 }, (_, i) => ({
      id: `rule-${i}`,
      name: `Rule ${i}`,
      tags: [],
      enabled: true,
      alertTypeId: 'siem.queryRule',
      params: { ruleId: `rl-${i}`, severity: 'medium', riskScore: 47, type: 'query' },
      updatedAt: '2026-01-01T00:00:00Z',
    }));
    findMock.mockResolvedValue({ total: 847, data: fakeRules });

    const result = await toolDef.handler(
      { perPage: 20 },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const message = (result.results[0].data as { message: string }).message;
    expect(message).toContain('847');
    expect(message).toContain('top 20');
    expect(message).toContain('Narrow');
    expect(result.results[0].data).toMatchObject({ total: 847 });
  });

  it('hints at security.discover_rule_tags when zero results and the filter used tags', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const result = await toolDef.handler(
      { tags: ['Network Security'] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const message = (result.results[0].data as { message: string }).message;
    expect(message).toContain('No detection rules matched');
    expect(message).toContain('security.discover_rule_tags');
    expect(message).toContain('may not exist');
  });

  it('hints at general exploration when zero results without a tag filter', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = await setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const result = await toolDef.handler(
      { severity: ['critical'] },
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

  it('uses findRules aggregations for tag discovery with the rules tag cap', async () => {
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
    expect(findMock.mock.calls[0][0].options.aggs.by_field.terms.size).toBe(EXPECTED_MAX_TAGS);
    expect(result.results[0].type).toBe(ToolResultType.other);
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
