/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
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
import { MATCH_PREBUILT_RULE_PROMPT_SPLUNK, MATCH_PREBUILT_RULE_PROMPT_GENERIC } from '../prompts';
import { MAX_MATCH_ATTEMPTS, NO_MATCH_SUMMARY, type MatchPrebuiltRuleState } from '../state';

interface GetMatchPrebuiltRuleAgentNodeParams {
  model: ChatModel;
  telemetryClient: RuleMigrationTelemetryClient;
}

interface PrebuiltRuleMatchResponse {
  match: string;
  summary: string;
}

const jsonParser = new JsonOutputParser<PrebuiltRuleMatchResponse>();

/**
 * Classifies the current attempt's `candidate_rules` against the source rule — a one-shot
 * classify-from-a-fixed-list call (mirroring v1's node), not a tool-calling agent. Only ever
 * reached with a non-empty `candidate_rules` — the subgraph's `candidatesRetryRouter` routes an
 * empty result straight back to `createPrebuiltRuleSemanticQuery` (or to `END`, once exhausted)
 * without visiting this node at all. If nothing matches here, this records the attempt in
 * `match_attempts` so `matchPrebuiltRetryRouter` can decide whether to loop back for another try
 * (up to `MAX_MATCH_ATTEMPTS` times, independent of `searchPrebuiltRuleCandidates`'s own
 * `MAX_SEARCH_ATTEMPTS` budget), or give up.
 */
export const getMatchPrebuiltRuleAgentNode = ({
  model,
  telemetryClient,
}: GetMatchPrebuiltRuleAgentNodeParams) => {
  return async (state: MatchPrebuiltRuleState): Promise<Partial<MatchPrebuiltRuleState>> => {
    const candidateRules = state.candidate_rules;
    const isFinalAttempt = state.match_attempts.length + 1 >= MAX_MATCH_ATTEMPTS;

    const candidatesForPrompt = candidateRules.map((rule) => ({
      name: rule.name,
      description: rule.description,
      query: rule.target?.type !== 'machine_learning' ? rule.target?.query : '',
    }));

    const splunkRule = {
      title: state.original_rule.title,
      description: state.original_rule.description,
      query: state.original_rule.query,
    };

    let promptTemplate: Awaited<ReturnType<ChatPromptTemplate['formatMessages']>>;
    if (state.original_rule.vendor === 'splunk') {
      promptTemplate = await MATCH_PREBUILT_RULE_PROMPT_SPLUNK.formatMessages({
        rules: JSON.stringify(candidatesForPrompt, null, 2),
        splunk_rule: JSON.stringify(splunkRule, null, 2),
      });
    } else {
      promptTemplate = await MATCH_PREBUILT_RULE_PROMPT_GENERIC.formatMessages({
        rules: JSON.stringify(candidatesForPrompt, null, 2),
        nl_rule_description:
          state.nl_query || `${state.original_rule.title} \n ${state.original_rule.description}`,
      });
    }

    const matchChain = model.pipe(jsonParser);
    const response = await matchChain.invoke([...promptTemplate]);

    const matchedName = response.match?.trim() || '';
    const matchedRule = matchedName
      ? candidateRules.find((rule) => rule.name === matchedName)
      : undefined;

    telemetryClient.reportPrebuiltRulesMatch({
      preFilterRules: candidateRules,
      ...(matchedRule ? { postFilterRule: matchedRule } : {}),
    });

    if (matchedRule) {
      return buildMatchResult(matchedRule, response.summary);
    }

    const summary = response.summary?.trim() || NO_MATCH_SUMMARY;
    return {
      match_attempts: [
        { query: state.semantic_query, candidateNames: candidateRules.map((rule) => rule.name) },
      ],
      ...(isFinalAttempt ? { comments: [generateAssistantComment(cleanMarkdown(summary))] } : {}),
    };
  };
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
