/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, ToolMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { MigrationTranslationResult } from '../../../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationsRetriever } from '../../../../retrievers';
import type { RuleMigrationTelemetryClient } from '../../../../rule_migrations_telemetry_client';
import type { RuleSemanticSearchResult } from '../../../../../types';
import {
  cleanMarkdown,
  generateAssistantComment,
} from '../../../../../../common/task/util/comments';
import type { ModelWithTools } from '../../../types';
import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
} from '../../../../../constants';
import type { PrebuiltRulesSearchResult } from '../../../tools/prebuilt_rules_search';
import { MATCH_PREBUILT_RULE_AGENT_PROMPT } from '../prompts';
import type { MatchPrebuiltRuleState } from '../state';

interface GetMatchPrebuiltRuleAgentNodeParams {
  model: ModelWithTools;
  telemetryClient: RuleMigrationTelemetryClient;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface PrebuiltRuleMatchResponse {
  match?: string;
  summary?: string;
  semantic_query?: string;
}

type ModelResponse = Awaited<ReturnType<ModelWithTools['invoke']>>;

const NO_MATCH_SUMMARY = '## Prebuilt Rule Matching Summary\nNo related prebuilt rule found.';

const jsonParser = new JsonOutputParser<PrebuiltRuleMatchResponse>();

export const getMatchPrebuiltRuleAgentNode = ({
  model,
  telemetryClient,
  ruleMigrationsRetriever,
}: GetMatchPrebuiltRuleAgentNodeParams) => {
  return async (state: MatchPrebuiltRuleState): Promise<Partial<MatchPrebuiltRuleState>> => {
    const techniqueIds = state.original_rule.annotations?.mitre_attack?.join(',') ?? '';

    const prompt = await MATCH_PREBUILT_RULE_AGENT_PROMPT.formatMessages({
      title: state.original_rule.title,
      description: state.original_rule.description,
      vendor: state.original_rule.vendor,
      query: state.original_rule.query,
      nlQuery: state.nl_query || '',
      mitreAttackIds: techniqueIds,
    });

    const response = await model.invoke([...prompt, ...state.messages]);

    if (hasToolCall(response) && BaseMessage.isInstance(response)) {
      return { messages: [response] };
    }

    const parsedResponse = await parseMatchResponse(getResponseText(response));
    const semanticQuery = resolveSemanticQuery(parsedResponse, state);
    const prebuiltRules = semanticQuery
      ? await ruleMigrationsRetriever.prebuiltRules.search(semanticQuery, techniqueIds)
      : [];

    const matchedName = parsedResponse?.match?.trim() || '';
    const matchedRule = matchedName
      ? prebuiltRules.find((rule) => rule.name === matchedName)
      : undefined;

    const summary = parsedResponse?.summary?.trim() || NO_MATCH_SUMMARY;
    const comments = [generateAssistantComment(cleanMarkdown(summary))];

    telemetryClient.reportPrebuiltRulesMatch({
      preFilterRules: prebuiltRules,
      ...(matchedRule ? { postFilterRule: matchedRule } : {}),
    });

    return buildMatchResult(response, comments, matchedRule);
  };
};

const hasToolCall = (response: ModelResponse): boolean => {
  return (
    Boolean(response) &&
    typeof response === 'object' &&
    'tool_calls' in response &&
    Array.isArray(response.tool_calls) &&
    response.tool_calls.length > 0
  );
};

const getResponseText = (response: ModelResponse): string => {
  return typeof response === 'string' ? response : response.text;
};

const parseMatchResponse = async (
  responseText: string
): Promise<PrebuiltRuleMatchResponse | undefined> => {
  try {
    return await jsonParser.parse(responseText);
  } catch {
    // LLM did not return valid JSON; fall back to no-match
    return undefined;
  }
};

const resolveSemanticQuery = (
  parsedResponse: PrebuiltRuleMatchResponse | undefined,
  state: MatchPrebuiltRuleState
): string => {
  const latestSearchPayload = getLatestPrebuiltRulesSearchPayload(state.messages);
  return (
    parsedResponse?.semantic_query?.trim() ||
    latestSearchPayload?.query ||
    `${state.original_rule.title} ${state.original_rule.description}`.trim()
  );
};

const buildMatchResult = (
  response: ModelResponse,
  comments: ReturnType<typeof generateAssistantComment>[],
  matchedRule: RuleSemanticSearchResult | undefined
): Partial<MatchPrebuiltRuleState> => {
  const responseMessages = BaseMessage.isInstance(response) ? { messages: [response] } : {};

  if (!matchedRule) {
    return { comments, ...responseMessages };
  }

  return {
    comments,
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
    ...responseMessages,
  };
};

const getLatestPrebuiltRulesSearchPayload = (
  messages: BaseMessage[]
): PrebuiltRulesSearchResult | undefined => {
  return [...messages]
    .reverse()
    .filter((msg): msg is ToolMessage => ToolMessage.isInstance(msg))
    .map((msg) => {
      try {
        const parsed = JSON.parse(typeof msg.content === 'string' ? msg.content : '');
        if (parsed.source === 'prebuiltRulesSearch') {
          return parsed as PrebuiltRulesSearchResult;
        }
      } catch {
        // ignore malformed tool payloads
      }
      return undefined;
    })
    .find((payload): payload is PrebuiltRulesSearchResult => Boolean(payload));
};
