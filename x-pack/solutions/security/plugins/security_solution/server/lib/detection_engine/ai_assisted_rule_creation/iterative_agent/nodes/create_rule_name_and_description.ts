/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT } from './prompts';
import type { RuleCreationAnnotation } from '../state';

interface CreateRuleNameAndDescriptionNodeParams {
  model: InferenceChatModel;
}

export const createRuleNameAndDescriptionNode = ({
  model,
}: CreateRuleNameAndDescriptionNodeParams) => {
  const jsonParser = new JsonOutputParser();
  const ruleCreationChain =
    CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT.pipe(model).pipe(jsonParser);
  return async (state: typeof RuleCreationAnnotation.State) => {
    try {
      const baseRuleParams = await ruleCreationChain.invoke({
        user_request: state.userQuery,
        esql_query: state.rule.query,
      });
      return {
        ...state,
        rule: { ...state.rule, ...baseRuleParams },
      };
    } catch (e) {
      return {
        ...state,
        errors: [...state.errors, `Failed to create rule name and description: ${e.message}`],
      };
    }
  };
};
