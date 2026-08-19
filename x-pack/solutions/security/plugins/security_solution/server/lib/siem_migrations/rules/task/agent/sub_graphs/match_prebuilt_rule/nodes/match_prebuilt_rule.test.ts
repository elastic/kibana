/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { getFinalizeMatchNode, getMatchPrebuiltRuleAgentNode } from './match_prebuilt_rule';
import type { MatchPrebuiltRuleState } from '../state';

const mockRule = {
  rule_id: 'test-rule',
  name: 'Suspicious MS Office Child Process',
  description: 'test-description',
};

const mockOtherRule = {
  rule_id: 'other-rule',
  name: 'wrong-name',
  description: 'other-description',
};

const baseState = {
  original_rule: {
    title: 'Office Document Executing Macro Code',
    description: 'Detects macro execution from office documents',
    vendor: 'splunk',
    query: '`sysmon` EventCode=7',
  },
  nl_query: '',
  match_prebuilt_rules_messages: [],
} as unknown as MatchPrebuiltRuleState;

const toolCallMessage = (query: string) =>
  new AIMessage({
    content: '',
    tool_calls: [{ type: 'tool_call', id: 'call-1', name: 'searchPrebuiltRules', args: { query } }],
  });

const finalMessage = (match: string, summary = '## Prebuilt Rule Matching Summary\nfoo') =>
  new AIMessage({ content: `\`\`\`json\n${JSON.stringify({ match, summary })}\n\`\`\`` });

// What `getMatchPrebuiltRuleAgentNode`'s `invokeAndValidateFinalAnswer` would have parsed out of a
// `finalMessage(match, summary)` and stashed in `state.match_prebuilt_rules_result`.
const matchResult = (match: string, summary = '## Prebuilt Rule Matching Summary\nfoo') => ({
  match,
  summary,
});

const malformedMessage = () => new AIMessage({ content: 'not valid json' });

const searchToolMessage = (candidates: (typeof mockRule)[]) =>
  new ToolMessage({
    tool_call_id: 'call-1',
    name: 'searchPrebuiltRules',
    content: JSON.stringify(
      candidates.map((rule) => ({ name: rule.name, description: rule.description }))
    ),
    artifact: candidates,
  });

describe('getMatchPrebuiltRuleAgentNode', () => {
  const mockInvoke = jest.fn();
  const model = { bindTools: () => ({ invoke: mockInvoke }) } as never;
  const tool = { name: 'searchPrebuiltRules' } as never;

  const node = getMatchPrebuiltRuleAgentNode({ model, tool });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds the conversation from the prompt template on the first turn (empty messages)', async () => {
    const aiMessage = toolCallMessage('office macro child process');
    mockInvoke.mockResolvedValueOnce(aiMessage);

    const result = await node(baseState);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    // system + human seed messages, plus the model's first AIMessage
    const seededMessages = mockInvoke.mock.calls[0][0];
    expect(seededMessages).toHaveLength(2);
    expect(SystemMessage.isInstance(seededMessages[0])).toBe(true);
    expect(HumanMessage.isInstance(seededMessages[1])).toBe(true);
    expect(result.match_prebuilt_rules_messages).toHaveLength(3);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(aiMessage);
    // still searching — nothing to parse yet
    expect(result.match_prebuilt_rules_result).toBeUndefined();
  });

  it('injects the match-evaluation and query prompts and re-invokes the model with the accumulated history on later turns', async () => {
    const priorMessages = [
      new SystemMessage('system'),
      new HumanMessage('human'),
      toolCallMessage('office macro child process'),
      searchToolMessage([mockRule]),
    ];
    const aiMessage = finalMessage('Suspicious MS Office Child Process');
    mockInvoke.mockResolvedValueOnce(aiMessage);

    const result = await node({ ...baseState, match_prebuilt_rules_messages: priorMessages });

    const [invokedMessages] = mockInvoke.mock.calls[0];
    // prior history unchanged, plus the match-evaluation prompt and the query prompt
    expect(invokedMessages).toHaveLength(priorMessages.length + 2);
    expect(invokedMessages.slice(0, priorMessages.length)).toEqual(priorMessages);
    expect(HumanMessage.isInstance(invokedMessages.at(-2))).toBe(true);
    expect(String(invokedMessages.at(-2)?.content)).toContain('<matching_guidelines>');

    // the failed queries belong to the query prompt, not the match prompt
    expect(HumanMessage.isInstance(invokedMessages.at(-1))).toBe(true);
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'Query: "office macro child process"'
    );
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'Candidates: "Suspicious MS Office Child Process"'
    );
    expect(String(invokedMessages.at(-2)?.content)).not.toContain(
      'Query: "office macro child process"'
    );

    // both injected prompts, plus the model's final answer
    expect(result.match_prebuilt_rules_messages).toHaveLength(3);
    expect(HumanMessage.isInstance(result.match_prebuilt_rules_messages?.[0])).toBe(true);
    expect(HumanMessage.isInstance(result.match_prebuilt_rules_messages?.[1])).toBe(true);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(aiMessage);
    // the model's final answer, parsed
    expect(result.match_prebuilt_rules_result).toEqual(
      matchResult('Suspicious MS Office Child Process')
    );
  });

  it('retries with a corrective message when the final answer is not valid JSON, then returns the parsed retry', async () => {
    const priorMessages = [
      new SystemMessage('system'),
      new HumanMessage('human'),
      toolCallMessage('office macro child process'),
      searchToolMessage([mockRule]),
    ];
    const badMessage = malformedMessage();
    const goodMessage = finalMessage('Suspicious MS Office Child Process');
    mockInvoke.mockResolvedValueOnce(badMessage).mockResolvedValueOnce(goodMessage);

    const result = await node({ ...baseState, match_prebuilt_rules_messages: priorMessages });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    // second invoke sees the first (invalid) answer plus a corrective nudge appended
    const [secondInvokeMessages] = mockInvoke.mock.calls[1];
    expect(secondInvokeMessages.at(-2)).toBe(badMessage);
    expect(HumanMessage.isInstance(secondInvokeMessages.at(-1))).toBe(true);

    // only the winning AIMessage is persisted to state — the invalid attempt and the corrective
    // nudge stay internal to the retry loop, so they don't count as extra agent turns
    expect(result.match_prebuilt_rules_messages).toHaveLength(3);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(goodMessage);
    expect(result.match_prebuilt_rules_result).toEqual(
      matchResult('Suspicious MS Office Child Process')
    );
  });

  it('gives up with no match_prebuilt_rules_result once retries are exhausted', async () => {
    const priorMessages = [
      new SystemMessage('system'),
      new HumanMessage('human'),
      toolCallMessage('office macro child process'),
      searchToolMessage([mockRule]),
    ];
    const firstBadMessage = malformedMessage();
    const secondBadMessage = malformedMessage();
    mockInvoke.mockResolvedValueOnce(firstBadMessage).mockResolvedValueOnce(secondBadMessage);

    const result = await node({ ...baseState, match_prebuilt_rules_messages: priorMessages });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result.match_prebuilt_rules_messages).toHaveLength(3);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(secondBadMessage);
    expect(result.match_prebuilt_rules_result).toBeUndefined();
  });

  it.each<{
    vendor: MatchPrebuiltRuleState['original_rule']['vendor'];
    shouldIncludeScopeGuideline: boolean;
  }>([
    { vendor: 'splunk', shouldIncludeScopeGuideline: false },
    { vendor: 'qradar', shouldIncludeScopeGuideline: true },
    { vendor: 'microsoft-sentinel', shouldIncludeScopeGuideline: true },
  ])(
    'injects the $vendor-branched match prompt (scope guideline included: $shouldIncludeScopeGuideline)',
    async ({ vendor, shouldIncludeScopeGuideline }) => {
      const priorMessages = [
        new SystemMessage('system'),
        new HumanMessage('human'),
        toolCallMessage('office macro child process'),
        searchToolMessage([mockRule]),
      ];
      mockInvoke.mockResolvedValueOnce(finalMessage('Suspicious MS Office Child Process'));

      await node({
        ...baseState,
        original_rule: { ...baseState.original_rule, vendor },
        match_prebuilt_rules_messages: priorMessages,
      });

      const [invokedMessages] = mockInvoke.mock.calls[0];
      // the match prompt precedes the query prompt
      const matchMessage = invokedMessages.at(-2);
      expect(String(matchMessage.content).includes('Consider the scope of both rules')).toBe(
        shouldIncludeScopeGuideline
      );
    }
  );
});

describe('getFinalizeMatchNode', () => {
  const mockReportPrebuiltRulesMatch = jest.fn();
  const telemetryClient = { reportPrebuiltRulesMatch: mockReportPrebuiltRulesMatch } as never;
  const node = getFinalizeMatchNode({ telemetryClient });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the match from the latest search ToolMessage artifact', async () => {
    const state = {
      ...baseState,
      match_prebuilt_rules_messages: [
        new SystemMessage('system'),
        new HumanMessage('human'),
        toolCallMessage('office macro child process'),
        searchToolMessage([mockRule]),
        finalMessage('Suspicious MS Office Child Process'),
      ],
      match_prebuilt_rules_result: matchResult('Suspicious MS Office Child Process'),
    };

    const result = await node(state);

    expect(result.elastic_rule?.prebuilt_rule_id).toBe('test-rule');
    expect(result.translation_result).toBe('full');
    expect(mockReportPrebuiltRulesMatch).toHaveBeenCalledWith({
      preFilterRules: [mockRule],
      postFilterRule: mockRule,
    });
  });

  it('uses the most recent search results when the model searched more than once', async () => {
    const state = {
      ...baseState,
      match_prebuilt_rules_messages: [
        new SystemMessage('system'),
        new HumanMessage('human'),
        toolCallMessage('office macro child process'),
        searchToolMessage([mockOtherRule]),
        toolCallMessage('office document macro execution sysmon'),
        searchToolMessage([mockRule]),
        finalMessage('Suspicious MS Office Child Process'),
      ],
      match_prebuilt_rules_result: matchResult('Suspicious MS Office Child Process'),
    };

    const result = await node(state);

    expect(result.elastic_rule?.prebuilt_rule_id).toBe('test-rule');
    expect(mockReportPrebuiltRulesMatch).toHaveBeenCalledWith({
      preFilterRules: [mockRule],
      postFilterRule: mockRule,
    });
  });

  it('returns a no-match summary with no elastic_rule when the model declines to match', async () => {
    const state = {
      ...baseState,
      match_prebuilt_rules_messages: [
        new SystemMessage('system'),
        new HumanMessage('human'),
        finalMessage(''),
      ],
      match_prebuilt_rules_result: matchResult(''),
    };

    const result = await node(state);

    expect(result.elastic_rule).toBeUndefined();
    expect(result.comments?.[0].message).toContain('foo');
    expect(mockReportPrebuiltRulesMatch).toHaveBeenCalledWith({ preFilterRules: [] });
  });

  it('falls back to the default no-match summary when there is no parsed match_prebuilt_rules_result', async () => {
    const state = {
      ...baseState,
      match_prebuilt_rules_messages: [
        new SystemMessage('system'),
        new HumanMessage('human'),
        toolCallMessage('office macro child process'),
        searchToolMessage([mockRule]),
        new AIMessage({ content: 'not json' }),
      ],
      match_prebuilt_rules_result: undefined,
    };

    const result = await node(state);

    expect(result.elastic_rule).toBeUndefined();
    expect(result.comments?.[0].message).toContain('No related prebuilt rule found');
  });

  it("returns a no-match summary when the model's matched name isn't in the latest candidates", async () => {
    const state = {
      ...baseState,
      match_prebuilt_rules_messages: [
        new SystemMessage('system'),
        new HumanMessage('human'),
        toolCallMessage('office macro child process'),
        searchToolMessage([mockOtherRule]),
        finalMessage('Suspicious MS Office Child Process'),
      ],
      match_prebuilt_rules_result: matchResult('Suspicious MS Office Child Process'),
    };

    const result = await node(state);

    expect(result.elastic_rule).toBeUndefined();
    expect(mockReportPrebuiltRulesMatch).toHaveBeenCalledWith({ preFilterRules: [mockOtherRule] });
  });
});
