/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { buildFullFilter, findRulesTool, SECURITY_FIND_RULES_TOOL_ID } from './find_rules_tool';

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
        'alert.attributes.params.type: "query"'
      );
    });

    it('builds tag clause', () => {
      expect(buildFullFilter([[{ tag: 'MITRE' }]], undefined)).toBe(
        'alert.attributes.tags: "MITRE"'
      );
    });

    it('builds risk score range clauses against params.* (alerting plugin rewrites to mapped_params under the hood)', () => {
      expect(buildFullFilter([[{ riskScoreMin: 70 }]], undefined)).toBe(
        'alert.attributes.params.risk_score >= 70'
      );
      expect(buildFullFilter([[{ riskScoreMax: 90 }]], undefined)).toBe(
        'alert.attributes.params.risk_score <= 90'
      );
    });

    it('builds mitreTechnique clause', () => {
      expect(buildFullFilter([[{ mitreTechnique: 'T1059' }]], undefined)).toBe(
        'alert.attributes.params.threat.technique.id: "T1059"'
      );
    });

    it('builds mitreTactic clause', () => {
      expect(buildFullFilter([[{ mitreTactic: 'TA0002' }]], undefined)).toBe(
        'alert.attributes.params.threat.tactic.id: "TA0002"'
      );
    });

    it('builds indexPattern unquoted for wildcard match', () => {
      expect(buildFullFilter([[{ indexPattern: 'logs-endpoint*' }]], undefined)).toBe(
        'alert.attributes.params.index: logs-endpoint*'
      );
    });

    it('builds ruleUuid clause as canonical SO-UUID filter (matches `kibana.alert.rule.uuid` and event-log `kibana.saved_objects.id`)', () => {
      // Mirrors the canonical KQL shape used by `enrich_filter_with_rule_ids.ts:convertRuleIdsToKQL`
      // and `convert_rule_ids_to_kuery_node.ts` in the alerting plugin.
      expect(
        buildFullFilter([[{ ruleUuid: '57fc3dd0-4383-4396-98e7-2bbfe6cde41f' }]], undefined)
      ).toBe('alert.id: "alert\\:57fc3dd0-4383-4396-98e7-2bbfe6cde41f"');
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
        'alert.attributes.tags: "MITRE" AND alert.attributes.tags: "Custom"'
      );
    });

    it('expresses a risk-score range via paired min/max conditions', () => {
      expect(buildFullFilter([[{ riskScoreMin: 70 }, { riskScoreMax: 90 }]], undefined)).toBe(
        'alert.attributes.params.risk_score >= 70 AND alert.attributes.params.risk_score <= 90'
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
        '(alert.attributes.params.severity: "critical" AND alert.attributes.tags: "MITRE") OR ' +
          '(alert.attributes.params.severity: "high" AND alert.attributes.tags: "Custom")'
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
        'NOT (alert.attributes.tags: "Custom")'
      );
    });

    it('combines filter + exclude with AND NOT', () => {
      expect(buildFullFilter([[{ tag: 'MITRE' }]], [[{ tag: 'Custom' }]])).toBe(
        '(alert.attributes.tags: "MITRE") AND NOT (alert.attributes.tags: "Custom")'
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
        'alert.attributes.tags: "tag\\:with\\:colons"'
      );
    });

    it('escapes parentheses and quotes', () => {
      expect(buildFullFilter([[{ tag: '(weird "tag")' }]], undefined)).toBe(
        'alert.attributes.tags: "\\(weird \\"tag\\"\\)"'
      );
    });
  });
});

describe('findRulesTool handler', () => {
  const setup = () => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolDef = findRulesTool(mockCore, mockLogger) as any;
    return { toolDef, findMock, aggregateMock, mockEsClient, mockLogger, mockRequest };
  };

  it('registers under the security.find_rules ID', () => {
    const { toolDef } = setup();
    expect(toolDef.id).toBe(SECURITY_FIND_RULES_TOOL_ID);
  });

  it('passes a structured filter through as KQL to rulesClient.find', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    findMock.mockResolvedValue({ total: 1, data: [] });
    const ctx = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

    await toolDef.handler({ filter: [[{ enabled: true }, { severity: 'critical' }]] }, ctx);

    expect(findMock).toHaveBeenCalledTimes(1);
    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toBe(
      'alert.attributes.enabled: true AND alert.attributes.params.severity: "critical"'
    );
    expect(args.options.consumers).toEqual(['siem']);
  });

  it('plumbs a ruleUuid condition through to rulesClient.find as canonical SO-UUID filter and returns the matched rule', async () => {
    // Guards the alerts → rule translation path. The model aggregates alerts by
    // `kibana.alert.rule.uuid`, then calls find_rules with those UUIDs. The filter must
    // reach rulesClient as `alert.id: "alert:<uuid>"` — the shape used by both
    // `enrich_filter_with_rule_ids.ts` (security_solution) and `convert_rule_ids_to_kuery_node.ts`
    // (alerting plugin).
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    const ruleUuid = '57fc3dd0-4383-4396-98e7-2bbfe6cde41f';
    const fakeRule = {
      id: ruleUuid,
      name: 'Suspicious PowerShell Execution',
      tags: ['MITRE'],
      enabled: true,
      alertTypeId: 'siem.queryRule',
      params: { rule_id: 'rl-static-12345', severity: 'critical', risk_score: 99, type: 'query' },
      schedule: { interval: '5m' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    findMock.mockResolvedValue({ total: 1, data: [fakeRule] });

    const result = await toolDef.handler(
      { filter: [[{ ruleUuid }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(findMock).toHaveBeenCalledTimes(1);
    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toBe(`alert.id: "alert\\:${ruleUuid}"`);
    expect(args.options.consumers).toEqual(['siem']);

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

  it('plumbs an indexPattern condition through as an unquoted wildcard KQL clause and returns the matched rule', async () => {
    // Guards the `params.index` wildcard-filter path. The KQL `params.index: logs-endpoint*`
    // shape relies on standard KQL wildcard semantics; we mock a rule whose params.index
    // array matches the pattern to confirm the plumbing.
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    const fakeRule = {
      id: 'rule-endpoint-1',
      name: 'Suspicious Endpoint Activity',
      tags: ['Domain: Endpoint'],
      enabled: true,
      alertTypeId: 'siem.queryRule',
      params: {
        rule_id: 'rule-endpoint-1-static',
        severity: 'high',
        risk_score: 73,
        type: 'query',
        index: ['logs-endpoint.events.process-*', 'logs-endpoint.events.network-*'],
      },
      schedule: { interval: '5m' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    findMock.mockResolvedValue({ total: 1, data: [fakeRule] });

    const result = await toolDef.handler(
      { filter: [[{ indexPattern: 'logs-endpoint.events.*' }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toBe('alert.attributes.params.index: logs-endpoint.events.*');

    const data = result.results[0].data as {
      total: number;
      rules: Array<{ id: string; ruleId: unknown; index: unknown }>;
    };
    expect(data.total).toBe(1);
    expect(data.rules[0].id).toBe('rule-endpoint-1');
    expect(data.rules[0].ruleId).toBe('rule-endpoint-1-static');
    expect(data.rules[0].index).toEqual([
      'logs-endpoint.events.process-*',
      'logs-endpoint.events.network-*',
    ]);
  });

  it('supports OR-of-AND-groups of ruleUuid conditions (multi-rule translation)', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const uuidA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const uuidB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await toolDef.handler(
      { filter: [[{ ruleUuid: uuidA }], [{ ruleUuid: uuidB }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const args = findMock.mock.calls[0][0];
    expect(args.options.filter).toBe(
      `(alert.id: "alert\\:${uuidA}") OR (alert.id: "alert\\:${uuidB}")`
    );
  });

  it('maps severity sortField to params.severity', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
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
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    await toolDef.handler(
      { sortField: 'risk_score', sortOrder: 'desc' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(findMock.mock.calls[0][0].options.sortField).toBe('params.risk_score');
  });

  it('calls rulesClient.aggregate when groupBy is set, with a 500-bucket size cap', async () => {
    const { toolDef, findMock, aggregateMock, mockEsClient, mockLogger, mockRequest } = setup();
    aggregateMock.mockResolvedValue({
      aggregations: { by_field: { buckets: [{ key: 'MITRE', doc_count: 3 }] } },
    });

    const result = await toolDef.handler(
      { groupBy: 'tags' },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(findMock).not.toHaveBeenCalled();
    expect(aggregateMock).toHaveBeenCalledTimes(1);
    expect(aggregateMock.mock.calls[0][0].aggs.by_field.terms.field).toBe('alert.attributes.tags');
    expect(aggregateMock.mock.calls[0][0].aggs.by_field.terms.size).toBe(500);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data.groups).toEqual([{ value: 'MITRE', count: 3 }]);
    expect(result.results[0].data.truncated).toBe(false);
  });

  it('flags truncation and surfaces sum_other_doc_count when the agg cap is hit', async () => {
    const { toolDef, aggregateMock, mockEsClient, mockLogger, mockRequest } = setup();
    aggregateMock.mockResolvedValue({
      aggregations: {
        by_field: {
          buckets: [{ key: 'MITRE', doc_count: 12 }],
          sum_other_doc_count: 47,
        },
      },
    });

    const result = await toolDef.handler(
      { groupBy: 'tags' },
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
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    findMock.mockRejectedValue(new Error('boom'));

    const result = await toolDef.handler(
      { filter: [[{ enabled: true }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('boom');
  });

  it('hints at groupBy:"tags" when zero results and the filter used a tag condition', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
    findMock.mockResolvedValue({ total: 0, data: [] });

    const result = await toolDef.handler(
      { filter: [[{ tag: 'Network Security' }]] },
      createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
    );

    const message = (result.results[0].data as { message: string }).message;
    expect(message).toContain('No detection rules matched');
    expect(message).toContain('groupBy: "tags"');
    expect(message).toContain('may not exist');
  });

  it('hints at general exploration when zero results without a tag condition', async () => {
    const { toolDef, findMock, mockEsClient, mockLogger, mockRequest } = setup();
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
