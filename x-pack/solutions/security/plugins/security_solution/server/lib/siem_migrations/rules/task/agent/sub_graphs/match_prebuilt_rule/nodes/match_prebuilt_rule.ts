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
  formatRetrySearchPrompt,
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
      return { aiMessage };
    }

    const matchResult = await parseFinalResponse(aiMessage.content);
    if (matchResult || attempt === MAX_FINAL_ANSWER_ATTEMPTS) {
      return { aiMessage, matchResult };
    }

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
    // Only needed on the first turn and when the last search returned no candidates.
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

      // Detects the router's retry path: last message is a no-match AIMessage with no tool calls.
      const lastMessage = matchPrebuiltRulesMessages.at(-1);
      const isRetryAfterNoMatch =
        AIMessage.isInstance(lastMessage) && !lastMessage.tool_calls?.length;

      // Match prompt with candidates, query prompt on empty search, retry prompt after a no-match.
      const injectedMessages = isRetryAfterNoMatch
        ? [new HumanMessage(formatRetrySearchPrompt(previousSearchAttempts))]
        : hasCandidatesToEvaluate(matchPrebuiltRulesMessages)
        ? await matchPrompt.formatMessages({
            previousQueries: formatPreviousQueriesPrompt(previousSearchAttempts),
          })
        : await formatCreateSemanticQueryMessages();

      const { aiMessage, matchResult } = await invokeAndValidateFinalAnswer([
        ...matchPrebuiltRulesMessages,
        ...injectedMessages,
      ]);

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
    // First turn — starts the conversation and issues the initial search
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
    // `undefined` when the model never produced valid JSON or exhausted the search budget without a final answer.
    const matchResult = state.match_prebuilt_rules_result;

    const searchCandidates = getSearchCandidates(state.match_prebuilt_rules_messages);

    const matchedName = matchResult?.match?.trim() || '';
    const matchedRule = matchedName
      ? searchCandidates.find((rule) => rule.name === matchedName)
      : undefined;

    telemetryClient.reportPrebuiltRulesMatch({
      preFilterRules: searchCandidates,
      ...(matchedRule ? { postFilterRule: matchedRule } : {}),
    });

    if (matchedRule) {
      return buildMatchResult(matchedRule, matchResult?.summary);
    }

    const summary = matchResult?.summary?.trim() || NO_MATCH_SUMMARY;
    return { comments: [generateAssistantComment(cleanMarkdown(summary))] };
  };
};

const getSearchCandidates = (messages: BaseMessage[]): RuleSemanticSearchResult[] => {
  const byName = new Map<string, RuleSemanticSearchResult>();
  for (const message of messages) {
    if (ToolMessage.isInstance(message) && Array.isArray(message.artifact)) {
      for (const rule of message.artifact as RuleSemanticSearchResult[]) {
        // Later searches override the same name so telemetry reflects the freshest hit.
        byName.set(rule.name, rule);
      }
    }
  }
  return [...byName.values()];
};

/** True when the last search returned candidates; checks only the last message, not earlier searches. */
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
