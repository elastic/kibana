/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { getFinalizeMatchNode, getMatchPrebuiltRuleAgentNode } from './match_prebuilt_rule';
import { MAX_TOOL_CALL_ATTEMPTS, type MatchPrebuiltRuleState } from '../state';
import { RETRY_SEARCH_PROMPT_PREFIX } from '../prompts';

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

  it('builds the conversation from the prompt template on the first turn (empty messages)', async () => {
    const aiMessage = toolCallMessage('office macro child process');
    mockInvoke.mockResolvedValueOnce(aiMessage);

    const result = await node(baseState);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    // system + human first-turn messages, plus the model's first AIMessage
    const firstTurnMessages = mockInvoke.mock.calls[0][0];
    expect(firstTurnMessages).toHaveLength(2);
    expect(SystemMessage.isInstance(firstTurnMessages[0])).toBe(true);
    expect(HumanMessage.isInstance(firstTurnMessages[1])).toBe(true);
    expect(String(firstTurnMessages[1].content)).not.toContain('<previous_search_attempts>');
    // nothing to evaluate yet, so the first turn gets the unconditional "call the tool" directive
    expect(String(firstTurnMessages[1].content)).toContain(
      'Call the searchPrebuiltRules tool with your best query'
    );
    expect(String(firstTurnMessages[1].content)).not.toContain(
      'Your most recent search returned no candidates'
    );
    expect(result.match_prebuilt_rules_messages).toHaveLength(3);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(aiMessage);
    // still searching — nothing to parse yet
    expect(result.match_prebuilt_rules_result).toBeUndefined();
  });

  it('injects only the match prompt when the search returned candidates to evaluate', async () => {
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
    // prior history unchanged, plus the match-evaluation prompt only
    expect(invokedMessages).toHaveLength(priorMessages.length + 1);
    expect(invokedMessages.slice(0, priorMessages.length)).toEqual(priorMessages);
    expect(HumanMessage.isInstance(invokedMessages.at(-1))).toBe(true);
    expect(String(invokedMessages.at(-1)?.content)).toContain('<matching_guidelines>');

    // The query prompt is not re-sent: its source rule and query guidelines are already in the
    // history above, and its closing "call the tool" directive would push the model to search again
    // over candidates it has not rejected yet.
    expect(String(invokedMessages.at(-1)?.content)).not.toContain('<previous_search_attempts>');
    expect(String(invokedMessages.at(-1)?.content)).not.toContain('<query_guidelines>');
    expect(String(invokedMessages.at(-1)?.content)).not.toContain(
      'Call the searchPrebuiltRules tool with your best query'
    );

    // ...but the queries already tried ride along compactly, so a re-search doesn't repeat one
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'Queries already tried: "office macro child process"'
    );

    // Answering is the default and re-searching needs a named query defect, so an unmet match bar
    // alone doesn't justify another search — scope mismatch in particular means an empty match,
    // since no reworded query can produce a differently-scoped rule that isn't in the catalog.
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'Search again only if you can name a specific defect in the query you just issued'
    );
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'A scope difference alone is not a query defect'
    );

    // The cap is stated once, statically, and interpolated from MAX_TOOL_CALL_ATTEMPTS so the two
    // can't drift. The model tracks it against the query list rather than counting its own turns.
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      `You may call searchPrebuiltRules at most ${MAX_TOOL_CALL_ATTEMPTS} times in total`
    );

    // Both the positive and the negative answer shape are demonstrated, so naming a rule isn't
    // the only worked example — an empty "match" is a valid and expected outcome.
    expect(String(invokedMessages.at(-1)?.content)).toContain('<example_response_no_match>');
    expect(String(invokedMessages.at(-1)?.content)).toContain('"match": ""');

    // the single injected prompt, plus the model's final answer
    expect(result.match_prebuilt_rules_messages).toHaveLength(2);
    expect(HumanMessage.isInstance(result.match_prebuilt_rules_messages?.[0])).toBe(true);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(aiMessage);
    // the model's final answer, parsed
    expect(result.match_prebuilt_rules_result).toEqual(
      matchResult('Suspicious MS Office Child Process')
    );
  });

  it('lists every query tried so the model can measure its own usage against the stated cap', async () => {
    // On the last allowed turn the query list has MAX_TOOL_CALL_ATTEMPTS entries, so the model
    // can see the cap is reached by comparing the list to the number in the guidelines — no turn
    // counting required, and nothing in the node has to detect this turn specially.
    const priorMessages = [
      new SystemMessage('system'),
      new HumanMessage('human'),
      toolCallMessage('office macro child process'),
      searchToolMessage([mockOtherRule]),
      toolCallMessage('office document macro execution'),
      searchToolMessage([mockOtherRule]),
      toolCallMessage('winword child process sysmon'),
      searchToolMessage([mockRule]),
    ];
    mockInvoke.mockResolvedValueOnce(finalMessage('Suspicious MS Office Child Process'));

    await node({ ...baseState, match_prebuilt_rules_messages: priorMessages });

    const [invokedMessages] = mockInvoke.mock.calls[0];
    const content = String(invokedMessages.at(-1)?.content);
    expect(content).toContain(
      'Queries already tried: "office macro child process", "office document macro execution", "winword child process sysmon"'
    );
    expect(content).toContain(
      `You may call searchPrebuiltRules at most ${MAX_TOOL_CALL_ATTEMPTS} times in total`
    );
    // the prompt is identical on every evaluation turn — no turn-dependent injection
    expect(content).not.toContain('This is your final turn');
  });

  it('injects the query prompt instead of the match prompt when the search returned nothing', async () => {
    const priorMessages = [
      new SystemMessage('system'),
      new HumanMessage('human'),
      toolCallMessage('office macro child process'),
      searchToolMessage([]),
    ];
    mockInvoke.mockResolvedValueOnce(toolCallMessage('office document macro execution sysmon'));

    const result = await node({ ...baseState, match_prebuilt_rules_messages: priorMessages });

    const [invokedMessages] = mockInvoke.mock.calls[0];
    expect(invokedMessages).toHaveLength(priorMessages.length + 1);
    // nothing came back, so there is nothing to evaluate and no match prompt is injected
    expect(String(invokedMessages.at(-1)?.content)).not.toContain('<matching_guidelines>');
    expect(String(invokedMessages.at(-1)?.content)).toContain('<previous_search_attempts>');
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'Query: "office macro child process"'
    );
    expect(String(invokedMessages.at(-1)?.content)).toContain('Candidates: none');
    // every listed query really did fail in this branch, so saying so is accurate here
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      'Your most recent search returned no candidates'
    );

    expect(result.match_prebuilt_rules_messages).toHaveLength(2);
    expect(result.match_prebuilt_rules_result).toBeUndefined();
  });

  it('injects the retry prompt when the last message is a no-match JSON answer', async () => {
    const priorMessages = [
      new SystemMessage('system'),
      new HumanMessage('human'),
      toolCallMessage('office macro child process'),
      searchToolMessage([mockOtherRule]),
      finalMessage(''),
    ];
    mockInvoke.mockResolvedValueOnce(toolCallMessage('office document macro execution sysmon'));

    const result = await node({ ...baseState, match_prebuilt_rules_messages: priorMessages });

    const [invokedMessages] = mockInvoke.mock.calls[0];
    expect(String(invokedMessages.at(-1)?.content)).toContain(RETRY_SEARCH_PROMPT_PREFIX);
    expect(String(invokedMessages.at(-1)?.content)).toContain(
      `You may call searchPrebuiltRules at most ${
        MAX_TOOL_CALL_ATTEMPTS - 1
      } more time(s) after this.`
    );
    expect(result.match_prebuilt_rules_messages).toHaveLength(2);
    expect(result.match_prebuilt_rules_result).toBeUndefined();
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
    expect(result.match_prebuilt_rules_messages).toHaveLength(2);
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
    expect(result.match_prebuilt_rules_messages).toHaveLength(2);
    expect(result.match_prebuilt_rules_messages?.at(-1)).toBe(secondBadMessage);
    expect(result.match_prebuilt_rules_result).toBeUndefined();
  });

  it.each<{
    vendor: MatchPrebuiltRuleState['original_rule']['vendor'];
    shouldUseGenericBullets: boolean;
  }>([
    { vendor: 'splunk', shouldUseGenericBullets: false },
    { vendor: 'qradar', shouldUseGenericBullets: true },
    { vendor: 'microsoft-sentinel', shouldUseGenericBullets: true },
  ])(
    'injects the $vendor-branched match prompt (generic bullets: $shouldUseGenericBullets)',
    async ({ vendor, shouldUseGenericBullets }) => {
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
      // the match prompt is the only message injected on an evaluation turn with candidates
      const matchMessage = invokedMessages.at(-1);
      // generic (qradar/sentinel) prompt uses broader threat-category criteria; splunk uses "almost identical"
      expect(String(matchMessage.content).includes('threat category or security objective')).toBe(
        shouldUseGenericBullets
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

  it('resolves the match from search ToolMessage artifacts', async () => {
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
      preFilterRules: [mockOtherRule, mockRule],
      postFilterRule: mockRule,
    });
  });

  it('resolves a match named from an earlier search after a later search returned different candidates', async () => {
    const state = {
      ...baseState,
      match_prebuilt_rules_messages: [
        new SystemMessage('system'),
        new HumanMessage('human'),
        toolCallMessage('office macro child process'),
        searchToolMessage([mockRule]),
        toolCallMessage('office document macro execution sysmon'),
        searchToolMessage([mockOtherRule]),
        finalMessage('Suspicious MS Office Child Process'),
      ],
      match_prebuilt_rules_result: matchResult('Suspicious MS Office Child Process'),
    };

    const result = await node(state);

    expect(result.elastic_rule?.prebuilt_rule_id).toBe('test-rule');
    expect(mockReportPrebuiltRulesMatch).toHaveBeenCalledWith({
      preFilterRules: [mockRule, mockOtherRule],
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

  it("returns a no-match summary when the model's matched name isn't in any search candidates", async () => {
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
