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
  formatPreviousQueriesPrompt,
  formatRetrySearchNudgePrompt,
  formatSearchInstructionsPrompt,
} from '../prompts';
import {
  NO_MATCH_SUMMARY,
  type MatchPrebuiltRuleState,
  type MatchPrebuiltRulesResult,
  type PreviousSearchAttempt,
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
    const matchPrebuiltRulesMessages = state.match_prebuilt_rules_messages;
    // Splunk has no nl_query, so we use the raw title/description/query.
    const ruleContext =
      state.nl_query ||
      `Title: ${state.original_rule.title}\nDescription: ${state.original_rule.description}\nQuery: ${state.original_rule.query}`;
    const techniqueIds = state.original_rule.annotations?.mitre_attack?.join(',') ?? '';
    const previousSearchAttempts = getPreviousSearchAttempts(matchPrebuiltRulesMessages);
    // Needed on the first turn, and again only when a search comes back empty — the two cases where
    // the model has nothing to judge and must produce a query. Deferred rather than rendered up
    // front so an evaluation turn with candidates doesn't build a message it won't send.
    const formatCreateSemanticQueryMessages = () =>
      CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT_V2.formatMessages({
        ruleContext,
        vendor: state.original_rule.vendor,
        mitreAttackIds: techniqueIds,
        searchInstructions: formatSearchInstructionsPrompt(previousSearchAttempts),
      });

    if (matchPrebuiltRulesMessages.length > 0) {
      const matchPrompt =
        state.original_rule.vendor === 'splunk'
          ? MATCH_PREBUILT_RULE_PROMPT_SPLUNK_V2
          : MATCH_PREBUILT_RULE_PROMPT_GENERIC_V2;

      // Router re-invoked this node after a no-match verdict: the last message in the conversation
      // is the model's no-match AIMessage (not a ToolMessage from a fresh search). Inject the retry
      // nudge so the model tries a different keyword angle. The router's `turnCount` cap prevents
      // this path from repeating more than `MAX_TOOL_CALL_ATTEMPTS - 1` times total.
      const lastMessage = matchPrebuiltRulesMessages.at(-1);
      const isRetryAfterNoMatch =
        AIMessage.isInstance(lastMessage) && !lastMessage.tool_calls?.length;

      // With candidates in hand the model's only job is to judge them, so the match prompt goes in
      // alone: the source rule and the query guidelines are already earlier in this conversation, so
      // re-injecting the query prompt would re-send them and end the turn on a "call the tool"
      // directive over candidates the model hasn't rejected yet. It still needs the queries already
      // tried, which ride along compactly on the match prompt. An empty search is the inverse —
      // nothing to judge — so the query prompt goes in instead.
      const injectedMessages = isRetryAfterNoMatch
        ? [new HumanMessage(formatRetrySearchNudgePrompt(previousSearchAttempts))]
        : hasCandidatesToEvaluate(matchPrebuiltRulesMessages)
        ? await matchPrompt.formatMessages({
            previousQueries: formatPreviousQueriesPrompt(previousSearchAttempts),
          })
        : await formatCreateSemanticQueryMessages();

      const { aiMessage, matchResult } = await invokeAndValidateFinalAnswer([
        ...matchPrebuiltRulesMessages,
        ...injectedMessages,
      ]);
      // Later turn (after a search or after a retry nudge). Only the injected prompt and the
      // model's reply are appended — the prior history is already in state. Either the model
      // finished:
      // { match_prebuilt_rules_messages: [
      //     HumanMessage { content: '<matching_guidelines>\nEvaluate the candidates returned...' },
      //     AIMessage { content: '```json\n{"match":"Suspicious MS Office Child Process",...}\n```' },
      //   ],
      //   match_prebuilt_rules_result: { match: 'Suspicious MS Office Child Process',
      //     summary: '## Prebuilt Rule...' } }
      // ...or it wants another search (routes back to `tools` or to `agent` via retry):
      // { match_prebuilt_rules_messages: [
      //     HumanMessage { content: '<matching_guidelines>...\nQueries already tried: "office macro child process".' },
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
      ...(await formatCreateSemanticQueryMessages()),
    ];

    const { aiMessage, matchResult } = await invokeAndValidateFinalAnswer(prompt);
    // First turn — starts the conversation and issues the initial search, e.g. for the Splunk rule
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

/**
 * Whether the search that just ran returned anything for the model to judge, which is what decides
 * between injecting the match prompt and the query prompt. Deliberately looks at the last message
 * only, unlike `getLatestCandidates` above: an empty or errored search must read as "no candidates"
 * rather than falling back to an earlier search's hits.
 */
const hasCandidatesToEvaluate = (messages: BaseMessage[]): boolean => {
  const lastMessage = messages.at(-1);
  return (
    ToolMessage.isInstance(lastMessage) &&
    Array.isArray(lastMessage.artifact) &&
    lastMessage.artifact.length > 0
  );
};

const getPreviousSearchAttempts = (messages: BaseMessage[]): PreviousSearchAttempt[] => {
  const toolResultsByCallId = new Map<string, RuleSemanticSearchResult[]>();
  messages.forEach((message) => {
    if (ToolMessage.isInstance(message) && message.name === 'searchPrebuiltRules') {
      toolResultsByCallId.set(
        message.tool_call_id,
        Array.isArray(message.artifact) ? (message.artifact as RuleSemanticSearchResult[]) : []
      );
    }
  });

  // One entry per query already issued, in call order, e.g. after two searches:
  // [{ query: 'office macro child process', candidateNames: ['wrong-name'] },
  //  { query: 'office document macro execution sysmon', candidateNames: [] }]
  // `[]` on the first turn, when the conversation holds no tool calls yet.
  return messages.filter(AIMessage.isInstance).flatMap((message) =>
    (message.tool_calls ?? [])
      .filter(
        (toolCall) =>
          toolCall.name === 'searchPrebuiltRules' && typeof toolCall.args.query === 'string'
      )
      .map((toolCall) => ({
        query: toolCall.args.query as string,
        candidateNames: (toolCall.id ? toolResultsByCallId.get(toolCall.id) ?? [] : []).map(
          ({ name }) => name
        ),
      }))
  );
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
