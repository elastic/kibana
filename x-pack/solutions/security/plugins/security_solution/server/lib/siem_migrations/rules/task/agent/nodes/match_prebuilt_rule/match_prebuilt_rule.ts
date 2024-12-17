/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { SiemMigrationRuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { GraphNode } from '../../types';
import { MATCH_PREBUILT_RULE_PROMPT } from './prompts';

interface GetMatchPrebuiltRuleNodeParams {
  model: ChatModel;
  logger: Logger;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface GetMatchedRuleResponse {
  match: string;
}

export const getMatchPrebuiltRuleNode = ({
  model,
  ruleMigrationsRetriever,
  logger,
}: GetMatchPrebuiltRuleNodeParams): GraphNode => {
  return async (state) => {
    const query = state.semantic_query;
    const techniqueIds = state.original_rule.annotations?.mitre_attack || [];
    const prebuiltRules = await ruleMigrationsRetriever.prebuiltRules.getRules(
      query,
      techniqueIds.join(',')
    );

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
    if (response.match) {
      const matchedRule = prebuiltRules.find((r) => r.name === response.match);
      if (matchedRule) {
        return {
          elastic_rule: {
            title: matchedRule.name,
            description: matchedRule.description,
            id: matchedRule.installedRuleId,
            prebuilt_rule_id: matchedRule.rule_id,
          },
          translation_result: SiemMigrationRuleTranslationResult.FULL,
        };
      }
    }
    const lookupTypes = ['inputlookup', 'outputlookup'];
    if (
      state.original_rule?.query &&
      lookupTypes.some((type) => state.original_rule.query.includes(type))
    ) {
      logger.debug(
        `Rule: ${state.original_rule?.title} did not match any prebuilt rule, but contains inputlookup, dropping`
      );
      return { translation_result: SiemMigrationRuleTranslationResult.UNTRANSLATABLE };
    }
    return {};
  };
};
