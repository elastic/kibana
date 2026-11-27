/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import type {
  OriginalRule,
  RuleMigrationRule,
} from '../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationIntegration } from '../../../server/lib/siem_migrations/rules/types';
import { CREATE_SEMANTIC_QUERY_PROMPT } from '../../../server/lib/siem_migrations/rules/task/agent/nodes/create_semantic_query/prompts';
import {
  MATCH_PREBUILT_RULE_PROMPT_GENERIC,
  MATCH_PREBUILT_RULE_PROMPT_SPLUNK,
} from '../../../server/lib/siem_migrations/rules/task/agent/nodes/match_prebuilt_rule/prompts';
import { MATCH_INTEGRATION_PROMPT } from '../../../server/lib/siem_migrations/rules/task/agent/sub_graphs/translate_rule/nodes/retrieve_integrations/prompts';
import type { PrebuiltRuleCandidate } from './rag';

export const NO_MATCH = 'no_match';

export type NodeName = 'retrieveIntegrations' | 'matchPrebuiltRule';

/** One decision, asked the same way to both models. */
export interface DecisionCase {
  node: NodeName;
  /** The graph's prompt, rendered exactly as the node renders it. */
  messages: BaseMessage[];
  /** The JSON key the node reads the LLM's pick from. */
  answerKey: 'id' | 'match';
  /** Candidate key (what the LLM answers with) to its description, plus `no_match`. */
  choices: Record<string, string>;
  /** The same prompt, split for the decision model. */
  decision: { input: string; instructions: string };
}

/**
 * The `nl_query` the graph's `sourceRuleToNaturalLanguage` node generated for QRadar and Sentinel
 * rules. The node stores it as the rule's first comment, through `cleanMarkdown`, which only renames
 * ```esql/```spl code fences. When the rule uses unsupported functions, the node stores an
 * explanation there instead and leaves `nl_query` unset.
 */
export const getNlQuery = (rule: RuleMigrationRule): string | undefined => {
  const message = rule.comments?.[0]?.message;
  if (rule.original_rule.vendor === 'splunk' || !message) {
    return undefined;
  }
  // Copied from nodes/source_rule_to_natural_language/source_rule_to_natural_language.ts
  return message.startsWith('This rule cannot be translated to a Custom Rule because')
    ? undefined
    : message;
};

// Same rule context as nodes/create_semantic_query/create_semantic_query.ts.
export const renderSemanticQueryPrompt = (rule: OriginalRule, nlQuery: string | undefined) =>
  CREATE_SEMANTIC_QUERY_PROMPT.formatMessages({
    ruleContext:
      nlQuery || `Title: ${rule.title}\nDescription: ${rule.description}\nQuery: ${rule.query}`,
  });

// Same inputs as retrieve_integrations.ts.
export const buildIntegrationCase = async (
  rule: OriginalRule,
  nlQuery: string | undefined,
  integrations: RuleMigrationIntegration[]
): Promise<DecisionCase> => {
  const integrationsInfo = integrations.map(({ id, title, description }) => ({
    id,
    title,
    description,
  }));
  const ruleToMatch = {
    title: rule.title,
    description: `${rule.description} ${nlQuery ? `\n Additional context: ${nlQuery}` : ''}`,
  };
  const messages = await MATCH_INTEGRATION_PROMPT.formatMessages({
    integrations: JSON.stringify(integrationsInfo, null, 2),
    rule: JSON.stringify(ruleToMatch, null, 2),
  });
  return {
    node: 'retrieveIntegrations',
    messages,
    answerKey: 'id',
    choices: toChoices(
      integrations.map(({ id, title, description }) => [id, `${title}: ${description}`])
    ),
    decision: splitForDecisionModel(messages, 'rule_description'),
  };
};

// Same inputs as nodes/match_prebuilt_rule/match_prebuilt_rule.ts.
export const buildPrebuiltRuleCase = async (
  rule: OriginalRule,
  nlQuery: string | undefined,
  prebuiltRules: PrebuiltRuleCandidate[]
): Promise<DecisionCase> => {
  const elasticSecurityRules = prebuiltRules.map((prebuiltRule) => ({
    name: prebuiltRule.name,
    description: prebuiltRule.description,
    query: prebuiltRule.target?.type !== 'machine_learning' ? prebuiltRule.target?.query : '',
  }));
  const isSplunk = rule.vendor === 'splunk';
  const messages = isSplunk
    ? await MATCH_PREBUILT_RULE_PROMPT_SPLUNK.formatMessages({
        rules: JSON.stringify(elasticSecurityRules, null, 2),
        splunk_rule: JSON.stringify(
          { title: rule.title, description: rule.description, query: rule.query },
          null,
          2
        ),
      })
    : await MATCH_PREBUILT_RULE_PROMPT_GENERIC.formatMessages({
        rules: JSON.stringify(elasticSecurityRules, null, 2),
        nl_rule_description: nlQuery || `${rule.title} \n ${rule.description}`,
      });
  return {
    node: 'matchPrebuiltRule',
    messages,
    answerKey: 'match',
    choices: toChoices(prebuiltRules.map(({ name, description }) => [name, description])),
    decision: splitForDecisionModel(messages, isSplunk ? 'splunk_rule' : 'nl_rule_description'),
  };
};

const toChoices = (candidates: Array<[string, string]>): Record<string, string> => {
  if (candidates.some(([key]) => key === NO_MATCH)) {
    throw new Error(`A candidate is named [${NO_MATCH}], which is reserved for "no match"`);
  }
  return {
    ...Object.fromEntries(candidates),
    [NO_MATCH]: 'None of the candidates is a match',
  };
};

/** Data the decision model reads as `input`; everything else of the prompt becomes `instructions`. */
const DATA_TAG = 'context';
/** Blocks that only describe the LLM's JSON answer; the decision model answers with a choice. */
const OUTPUT_FORMAT_TAGS = ['expected_output', 'example_response'];

/**
 * Splits the graph's rendered prompt for the decision model: the candidates and the rule become
 * `input`, the remaining prompt text becomes `instructions`. Throws when a block is missing so a
 * prompt change can't silently produce a different split.
 */
export const splitForDecisionModel = (messages: BaseMessage[], ruleTag: string) => {
  let text = messages.map((message) => String(message.content)).join('\n\n');
  const takeBlock = (tag: string) => {
    const block = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`).exec(text)?.[0];
    if (!block) {
      throw new Error(`Prompt has no <${tag}> block`);
    }
    text = text.replace(block, '');
    return block;
  };

  const input = [takeBlock(DATA_TAG), takeBlock(ruleTag)].join('\n\n');
  OUTPUT_FORMAT_TAGS.forEach(takeBlock);
  return { input, instructions: text.replace(/\n{3,}/g, '\n\n').trim() };
};
