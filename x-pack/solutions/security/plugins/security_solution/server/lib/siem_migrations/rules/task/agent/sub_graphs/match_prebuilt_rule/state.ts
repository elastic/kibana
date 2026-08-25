/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { MigrationTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type {
  ElasticRulePartial,
  OriginalRule,
  RuleMigrationRule,
} from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';

/**
 * Max times the `agent` node invokes the model within a single subgraph run. The model itself
 * decides — via the bound `searchPrebuiltRules` tool — whether/when to search and with what
 * query, so there's no deterministic step count to bound; this instead caps the length of the
 * agent/tools loop in `./graph.ts` so a model that keeps calling the tool can't run forever.
 * Worst case: the model calls the tool on every turn but the last, i.e. up to
 * `MAX_TOOL_CALL_ATTEMPTS - 1` (3) searches plus one final synthesis turn. The matching guidelines
 * in `./prompts.ts` interpolate that same `- 1` so the model knows the ceiling and doesn't waste its
 * last turn on a search the router would discard. It tracks the cap by comparing it against the
 * `{previousQueries}` list injected alongside, which is more reliable than asking it to count its
 * own turns. The ceiling on its own would invite spending the remainder, so the guidelines gate
 * searching behind an enumerated list of query defects (security-team#18589).
 */
export const MAX_TOOL_CALL_ATTEMPTS = 4;

export const NO_MATCH_SUMMARY =
  '## Prebuilt Rule Matching Summary\nNo related prebuilt rule found.';

/**
 * The model's final (non-tool-calling) answer, once `getMatchPrebuiltRuleAgentNode`'s
 * `invokeAndValidateFinalAnswer` (`./nodes/match_prebuilt_rule.ts`) has parsed and validated it as
 * JSON, retrying with a corrective message on malformed JSON. `undefined` while the model is
 * still calling the tool, or if it never produced valid JSON even after retrying.
 * `getFinalizeMatchNode` reads this directly instead of re-parsing the conversation itself.
 */
export interface MatchPrebuiltRulesResult {
  match?: string;
  summary?: string;
}

/**
 * One `searchPrebuiltRules` call already made in this subgraph run, paired with the candidate names
 * it returned. Extracted from the conversation by `getPreviousSearchAttempts`
 * (`./nodes/match_prebuilt_rule.ts`) and rendered by the two formatters in `./prompts.ts`. Note the
 * last entry is the search the model has not judged yet, so anything presenting the whole list as
 * failures is only correct once that search is known to have returned nothing.
 */
export interface PreviousSearchAttempt {
  query: string;
  candidateNames: string[];
}

export const matchPrebuiltRuleState = Annotation.Root({
  original_rule: Annotation<OriginalRule>(),

  // Splunk is the one falls back to ''
  nl_query: Annotation<string>({
    reducer: (current, value) => value ?? current,
    default: () => '',
  }),
  elastic_rule: Annotation<ElasticRulePartial>({
    reducer: (state, action) => ({ ...state, ...action }),
    default: () => ({} as ElasticRulePartial),
  }),
  translation_result: Annotation<MigrationTranslationResult>(),
  comments: Annotation<RuleMigrationRule['comments']>({
    reducer: (current, value) => (value ? (current ?? []).concat(value) : current),
    default: () => [],
  }),
  // The agent/tools loop's conversation history — system+human first-turn prompt, each AI turn (with or
  // without tool_calls), each ToolMessage the `tools` node produces in response, and the
  // step-specific human "evaluate these candidates" message the `agent` node injects before
  // every re-invocation (see ../prompts.ts). `ToolNode` only accepts `BaseMessage[]` or
  // `{ messages }`, so `./graph.ts` adapts this field for it instead of handing it the state.
  match_prebuilt_rules_messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  match_prebuilt_rules_result: Annotation<MatchPrebuiltRulesResult | undefined>({
    reducer: (current, value) => value ?? current,
    default: () => undefined,
  }),
});

export type MatchPrebuiltRuleState = typeof matchPrebuiltRuleState.State;
