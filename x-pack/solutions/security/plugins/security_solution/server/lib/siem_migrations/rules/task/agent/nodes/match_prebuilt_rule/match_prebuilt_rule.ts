/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
  RuleTranslationResult,
} from '../../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { GraphNode } from '../../types';
import { MATCH_PREBUILT_RULE_PROMPT } from './prompts';
import { cleanMarkdown } from '../../../util/comments';

interface GetMatchPrebuiltRuleNodeParams {
  model: ChatModel;
  logger: Logger;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface GetMatchedRuleResponse {
  match: string;
  summary: string;
}

export const getMatchPrebuiltRuleNode = ({
  model,
  ruleMigrationsRetriever,
  logger,
}: GetMatchPrebuiltRuleNodeParams): GraphNode => {
  return async (state) => {
    const query = state.semantic_query;
    const techniqueIds = state.original_rule.annotations?.mitre_attack || [];
    const prebuiltRules = await ruleMigrationsRetriever.prebuiltRules.search(
      query,
      techniqueIds.join(',')
    );
    if (prebuiltRules.length === 0) {
      return { comments: ['## Prebuilt Rule Matching Summary\nNo related prebuilt rule found.'] };
    }

    const outputParser = new JsonOutputParser();
    const mostRelevantRule = MATCH_PREBUILT_RULE_PROMPT.pipe(model).pipe(outputParser);

    const elasticSecurityRules = prebuiltRules.map((rule) => {
      return {
        name: rule.name,
        description: rule.description,
      };
    });

    const splunkRule = {
      title: state.original_rule.title,
      description: state.original_rule.description,
    };

    /*
     * Takes the most relevant rule from the array of rule(s) returned by the semantic query, returns either the most relevant or none.
     */
    const response = (await mostRelevantRule.invoke({
      rules: JSON.stringify(elasticSecurityRules, null, 2),
      splunk_rule: JSON.stringify(splunkRule, null, 2),
    })) as GetMatchedRuleResponse;

    const comments = response.summary ? [cleanMarkdown(response.summary)] : undefined;

    if (response.match) {
      const matchedRule = prebuiltRules.find((r) => r.name === response.match);
      if (matchedRule) {
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
          translation_result: RuleTranslationResult.FULL,
        };
      }
    }
    return { comments };
  };
};
