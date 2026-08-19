/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { MigrationTranslationResult } from '../../../../../../../../../common/siem_migrations/constants';
import type { ChatModel } from '../../../../../../common/task/util/actions_client_chat';
import type { RuleMigrationTelemetryClient } from '../../../../rule_migrations_telemetry_client';
import type { RuleSemanticSearchResult } from '../../../../../types';
import {
  cleanMarkdown,
  generateAssistantComment,
} from '../../../../../../common/task/util/comments';
import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
} from '../../../../../constants';
import {
  CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT_V2,
  MATCH_PREBUILT_RULE_PROMPT_GENERIC_V2,
  MATCH_PREBUILT_RULE_PROMPT_SPLUNK_V2,
  MATCH_PREBUILT_RULE_SYSTEM_PROMPT_V2,
} from '../prompts';
import {
  NO_MATCH_SUMMARY,
  type MatchPrebuiltRuleState,
  type MatchPrebuiltRulesResult,
} from '../state';

interface GetMatchPrebuiltRuleAgentNodeParams {
  model: ChatModel;
  tool: StructuredToolInterface;
}

const jsonParser = new JsonOutputParser<MatchPrebuiltRulesResult>();

const parseFinalResponse = async (
  content: unknown
): Promise<MatchPrebuiltRulesResult | undefined> => {
  if (typeof content !== 'string') {
    return undefined;
  }
  try {
    return await jsonParser.parse(content);
  } catch {
    // LLM did not return valid JSON on its final (non-tool-calling) turn; caller decides whether
    // to retry or give up.
    return undefined;
  }
};

// Including the first attempt.
const MAX_FINAL_ANSWER_ATTEMPTS = 2;

const RETRY_ON_MALFORMED_JSON_MESSAGE = new HumanMessage(
  'Your last reply was not valid JSON. Reply with a JSON object inside three backticks as instructed.'
);

interface FinalAnswerResult {
  aiMessage: AIMessage;
  matchResult?: MatchPrebuiltRulesResult;
}

/**
 * LangGraph invokes the returned `agent` node under these scenarios:
 * - On initial entry (`START -> agent`), with no messages, to generate the first prebuilt-rule
 *   search tool call.
 * - After every prebuilt-rule search (`tools -> agent`), with the accumulated conversation and its
 *   `ToolMessage`, to evaluate candidates and either finish or request another search.
 */
export const getMatchPrebuiltRuleAgentNode = ({
  model,
  tool,
}: GetMatchPrebuiltRuleAgentNodeParams) => {
  const modelWithTools = model.bindTools([tool]);

  const invokeAndValidateFinalAnswer = async (
    messages: BaseMessage[],
    attempt = 1
  ): Promise<FinalAnswerResult> => {
    const aiMessage = await modelWithTools.invoke(messages);

    const isSearchingAgain = Boolean(aiMessage.tool_calls?.length);
    if (isSearchingAgain) {
      // No `matchResult` — the model asked for another search instead of answering, e.g.
      // { aiMessage: AIMessage { content: '', tool_calls: [{ id: 'call_1',
      //     name: 'searchPrebuiltRules', args: { query: 'windows office macro process creation' } }] } }
      return { aiMessage };
    }

    const matchResult = await parseFinalResponse(aiMessage.content);
    if (matchResult || attempt === MAX_FINAL_ANSWER_ATTEMPTS) {
      // Valid JSON answer, e.g.
      // { aiMessage: AIMessage { content: '```json\n{"match":"Suspicious MS Office Child Process",...}\n```' },
      //   matchResult: { match: 'Suspicious MS Office Child Process',
      //     summary: '## Prebuilt Rule Matching Summary\nBoth rules detect macro-spawned child processes.' } }
      // Or, on the last attempt with still-malformed JSON:
      // { aiMessage: AIMessage { content: 'The closest rule is Suspicious MS Office Child Process' },
      //   matchResult: undefined }
      return { aiMessage, matchResult };
    }

    // Malformed JSON with an attempt left: re-invokes with the bad answer plus the corrective nudge
    // appended, and returns whichever of the two shapes above that second attempt produces.
    return invokeAndValidateFinalAnswer(
      [...messages, aiMessage, RETRY_ON_MALFORMED_JSON_MESSAGE],
      attempt + 1
    );
  };

  return async (state: MatchPrebuiltRuleState): Promise<Partial<MatchPrebuiltRuleState>> => {
    const messages = state.match_prebuilt_rules_messages;
    // Splunk has no nl_query, so we use the raw title/description/query.
    const ruleContext =
      state.nl_query ||
      `Title: ${state.original_rule.title}\nDescription: ${state.original_rule.description}\nQuery: ${state.original_rule.query}`;
    const techniqueIds = state.original_rule.annotations?.mitre_attack?.join(',') ?? '';
    // Rendered on every turn, because every turn can end in a search: the first one, and each retry
    // the model decides on after rejecting the candidates it just saw. Carrying
    // `previousSearchAttempts` here — rather than on the match prompt — keeps the failed queries in
    // the same message as the instructions for inventing the next one. Empty on the first turn,
    // since the conversation holds no tool calls yet.
    const queryMessages = await CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT_V2.formatMessages({
      ruleContext,
      vendor: state.original_rule.vendor,
      mitreAttackIds: techniqueIds,
      previousSearchAttempts: getPreviousSearchAttempts(messages),
    });

    if (messages.length > 0) {
      const matchPrompt =
        state.original_rule.vendor === 'splunk'
          ? MATCH_PREBUILT_RULE_PROMPT_SPLUNK_V2
          : MATCH_PREBUILT_RULE_PROMPT_GENERIC_V2;
      // Evaluate the candidates first, then the query instructions the model needs only if it
      // rejects them all and searches again.
      const injectedMessages = [...(await matchPrompt.formatMessages({})), ...queryMessages];
      const { aiMessage, matchResult } = await invokeAndValidateFinalAnswer([
        ...messages,
        ...injectedMessages,
      ]);
      // Later turn (after a search). Only the two injected prompts and the model's reply are
      // appended — the prior history is already in state. Either the model finished:
      // { match_prebuilt_rules_messages: [
      //     HumanMessage { content: '<matching_guidelines>\nEvaluate the candidates returned...' },
      //     HumanMessage { content: 'Source rule context:...\n<previous_search_attempts>\n- Query: ...' },
      //     AIMessage { content: '```json\n{"match":"Suspicious MS Office Child Process",...}\n```' },
      //   ],
      //   match_prebuilt_rules_result: { match: 'Suspicious MS Office Child Process',
      //     summary: '## Prebuilt Rule...' } }
      // ...or it wants another search (routes back to `tools`):
      // { match_prebuilt_rules_messages: [HumanMessage { content: '<matching_guidelines>...' },
      //     HumanMessage { content: '...<previous_search_attempts>\n- Query: "office macro child process"...' },
      //     AIMessage { content: '', tool_calls: [{ name: 'searchPrebuiltRules',
      //       args: { query: 'office document macro execution sysmon' } }] }],
      //   match_prebuilt_rules_result: undefined }
      return {
        match_prebuilt_rules_messages: [...injectedMessages, aiMessage],
        match_prebuilt_rules_result: matchResult,
      };
    }

    const prompt = [
      ...(await MATCH_PREBUILT_RULE_SYSTEM_PROMPT_V2.formatMessages({})),
      ...queryMessages,
    ];

    const { aiMessage, matchResult } = await invokeAndValidateFinalAnswer(prompt);
    // First turn — seeds the conversation and issues the initial search, e.g. for the Splunk rule
    // 'Office Document Executing Macro Code':
    // { match_prebuilt_rules_messages: [
    //     SystemMessage { content: 'You are an expert assistant in Cybersecurity...' },
    //     HumanMessage { content: 'Source rule context:\nTitle: Office Document Executing Macro Code\n...' },
    //     AIMessage { content: '', tool_calls: [{ name: 'searchPrebuiltRules',
    //       args: { query: 'windows office macro child process creation sysmon event id 7' } }] },
    //   ],
    //   match_prebuilt_rules_result: undefined }
    return {
      match_prebuilt_rules_messages: [...prompt, aiMessage],
      match_prebuilt_rules_result: matchResult,
    };
  };
};

interface GetFinalizeMatchNodeParams {
  telemetryClient: RuleMigrationTelemetryClient;
}

export const getFinalizeMatchNode = ({ telemetryClient }: GetFinalizeMatchNodeParams) => {
  return async (state: MatchPrebuiltRuleState): Promise<Partial<MatchPrebuiltRuleState>> => {
    // Already parsed and validated by `getMatchPrebuiltRuleAgentNode`'s
    // `invokeAndValidateFinalAnswer` above — `undefined` here means either the turn cap was hit
    // while the model kept calling the tool, or its final answer stayed malformed JSON even after
    // retrying.
    const matchResult = state.match_prebuilt_rules_result;

    const latestCandidates = getLatestCandidates(state.match_prebuilt_rules_messages);

    const matchedName = matchResult?.match?.trim() || '';
    const matchedRule = matchedName
      ? latestCandidates.find((rule) => rule.name === matchedName)
      : undefined;

    telemetryClient.reportPrebuiltRulesMatch({
      preFilterRules: latestCandidates,
      ...(matchedRule ? { postFilterRule: matchedRule } : {}),
    });

    if (matchedRule) {
      // The model's match resolved to a real candidate — see `buildMatchResult` below for the
      // shape, e.g. { comments: [...], elastic_rule: { prebuilt_rule_id: 'test-rule', ... },
      //   translation_result: 'full' }
      return buildMatchResult(matchedRule, matchResult?.summary);
    }

    const summary = matchResult?.summary?.trim() || NO_MATCH_SUMMARY;
    // No match: only a comment, no `elastic_rule`/`translation_result`, so the parent graph falls
    // through to the translation subgraph. e.g.
    // { comments: [{ message: '## Prebuilt Rule Matching Summary\nNo related prebuilt rule found.',
    //     created_at: '2026-08-19T15:04:05.000Z', created_by: 'assistant' }] }
    return { comments: [generateAssistantComment(cleanMarkdown(summary))] };
  };
};

const getLatestCandidates = (messages: BaseMessage[]): RuleSemanticSearchResult[] => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (ToolMessage.isInstance(message) && Array.isArray(message.artifact)) {
      // The full search results the model only saw a compact projection of, e.g.
      // [{ rule_id: 'test-rule', name: 'Suspicious MS Office Child Process',
      //    description: 'Identifies suspicious child processes of frequently targeted...',
      //    target: { severity: 'high', risk_score: 73, related_integrations: [{ package: 'windows' }] },
      //    current: { id: '9f1c2d3e-...' } }]
      return message.artifact as RuleSemanticSearchResult[];
    }
  }
  // No search ran this subgraph invocation (the model never called the tool), so there's nothing
  // to resolve a match against: []
  return [];
};

const getPreviousSearchAttempts = (messages: BaseMessage[]): string => {
  const toolResultsByCallId = new Map<string, RuleSemanticSearchResult[]>();
  messages.forEach((message) => {
    if (ToolMessage.isInstance(message) && message.name === 'searchPrebuiltRules') {
      toolResultsByCallId.set(
        message.tool_call_id,
        Array.isArray(message.artifact) ? (message.artifact as RuleSemanticSearchResult[]) : []
      );
    }
  });

  const attempts = messages.filter(AIMessage.isInstance).flatMap((message) =>
    (message.tool_calls ?? [])
      .filter(
        (toolCall) =>
          toolCall.name === 'searchPrebuiltRules' && typeof toolCall.args.query === 'string'
      )
      .map((toolCall) => {
        const candidates = toolCall.id ? toolResultsByCallId.get(toolCall.id) ?? [] : [];
        const candidateNames =
          candidates.length > 0 ? candidates.map(({ name }) => `"${name}"`).join(', ') : 'none';

        return `- Query: "${toolCall.args.query}"\n  Candidates: ${candidateNames}`;
      })
  );

  // One line per query already tried, injected into the match prompt so the model doesn't repeat
  // itself if it decides to search again. e.g. after two searches:
  // '- Query: "office macro child process"\n  Candidates: "wrong-name"\n
  //  - Query: "office document macro execution sysmon"\n  Candidates: none'
  // '' on the first evaluation turn's history if no tool call was ever made.
  return attempts.join('\n');
};

const buildMatchResult = (
  matchedRule: RuleSemanticSearchResult,
  summary: string | undefined
): Partial<MatchPrebuiltRuleState> => {
  const comments = summary?.trim() ? [generateAssistantComment(cleanMarkdown(summary))] : undefined;

  // The final matched state, e.g.
  // { comments: [{ message: '## Prebuilt Rule Matching Summary\nBoth rules detect...' }],
  //   elastic_rule: { title: 'Suspicious MS Office Child Process',
  //     description: 'Identifies suspicious child processes of frequently targeted...',
  //     prebuilt_rule_id: 'test-rule', id: '9f1c2d3e-...', integration_ids: ['windows'],
  //     severity: 'high', risk_score: 73 },
  //   translation_result: 'full' }
  // `comments` is omitted when the model returned a match with no summary; `severity`/`risk_score`
  // fall back to DEFAULT_TRANSLATION_* when the target rule doesn't specify them.
  return {
    ...(comments ? { comments } : {}),
    elastic_rule: {
      title: matchedRule.name,
      description: matchedRule.description,
      prebuilt_rule_id: matchedRule.rule_id,
      id: matchedRule.current?.id,
      integration_ids: matchedRule.target?.related_integrations?.map((i) => i.package),
      severity: matchedRule.target?.severity ?? DEFAULT_TRANSLATION_SEVERITY,
      risk_score: matchedRule.target?.risk_score ?? DEFAULT_TRANSLATION_RISK_SCORE,
    },
    translation_result: MigrationTranslationResult.FULL,
  };
};
