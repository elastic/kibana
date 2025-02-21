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
import type { SiemMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import type { ChatModel } from '../../../util/actions_client_chat';
import { cleanMarkdown, generateAssistantComment } from '../../../util/comments';
import type { GraphNode } from '../../types';
import { MATCH_PREBUILT_RULE_PROMPT } from './prompts';

interface GetMatchPrebuiltRuleNodeParams {
  model: ChatModel;
  logger: Logger;
  telemetryClient: SiemMigrationTelemetryClient;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface GetMatchedRuleResponse {
  match: string;
  summary: string;
}

export const getMatchPrebuiltRuleNode = ({
  model,
  ruleMigrationsRetriever,
  telemetryClient,
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
      telemetryClient.reportPrebuiltRulesMatch({ preFilterRules: [] });

      return {
        comments: [
          generateAssistantComment(
            '## Prebuilt Rule Matching Summary\nNo related prebuilt rule found.'
          ),
        ],
      };
    }

    const outputParser = new JsonOutputParser();
    const mostRelevantRule = MATCH_PREBUILT_RULE_PROMPT.pipe(model).pipe(outputParser);

    const elasticSecurityRules = prebuiltRules.map((rule) => {
      return {
        name: rule.name,
        description: rule.description,
        query: rule.target?.type !== 'machine_learning' ? rule.target?.query : '',
      };
    });

    const splunkRule = {
      title: state.original_rule.title,
      description: state.original_rule.description,
      query: state.original_rule.query,
    };

    /*
     * Takes the most relevant rule from the array of rule(s) returned by the semantic query, returns either the most relevant or none.
     */
    const response = (await mostRelevantRule.invoke({
      rules: JSON.stringify(elasticSecurityRules, null, 2),
      splunk_rule: JSON.stringify(splunkRule, null, 2),
    })) as GetMatchedRuleResponse;

    const comments = response.summary
      ? [generateAssistantComment(cleanMarkdown(response.summary))]
      : undefined;

    if (response.match) {
      const matchedRule = prebuiltRules.find((r) => r.name === response.match);
      telemetryClient.reportPrebuiltRulesMatch({
        preFilterRules: prebuiltRules,
        postFilterRule: matchedRule,
      });
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
