/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { MatchPrebuiltRuleState } from '../../state';

interface MockPrebuiltRule {
  rule_id: string;
  name: string;
  description: string;
}

export const mockRule: MockPrebuiltRule = {
  rule_id: 'test-rule',
  name: 'Suspicious MS Office Child Process',
  description: 'test-description',
};

export const mockOtherRule: MockPrebuiltRule = {
  rule_id: 'other-rule',
  name: 'wrong-name',
  description: 'other-description',
};

export const baseState = {
  original_rule: {
    title: 'Office Document Executing Macro Code',
    description: 'Detects macro execution from office documents',
    vendor: 'splunk',
    query: '`sysmon` EventCode=7',
  },
  nl_query: '',
  match_prebuilt_rules_messages: [],
} as unknown as MatchPrebuiltRuleState;

export const toolCallMessage = (query: string) =>
  new AIMessage({
    content: '',
    tool_calls: [{ type: 'tool_call', id: 'call-1', name: 'searchPrebuiltRules', args: { query } }],
  });

export const finalMessage = (match: string, summary = '## Prebuilt Rule Matching Summary\nfoo') =>
  new AIMessage({ content: `\`\`\`json\n${JSON.stringify({ match, summary })}\n\`\`\`` });

// What `getMatchPrebuiltRuleAgentNode`'s `invokeAndValidateFinalAnswer` would have parsed out of a
// `finalMessage(match, summary)` and stashed in `state.match_prebuilt_rules_result`.
export const matchResult = (match: string, summary = '## Prebuilt Rule Matching Summary\nfoo') => ({
  match,
  summary,
});

export const malformedMessage = () => new AIMessage({ content: 'not valid json' });

export const searchToolMessage = (candidates: MockPrebuiltRule[]) =>
  new ToolMessage({
    tool_call_id: 'call-1',
    name: 'searchPrebuiltRules',
    content: JSON.stringify(
      candidates.map((rule) => ({ name: rule.name, description: rule.description }))
    ),
    artifact: candidates,
  });
