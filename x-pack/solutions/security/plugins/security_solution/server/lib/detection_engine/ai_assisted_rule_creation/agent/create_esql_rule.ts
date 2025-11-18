/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { CREATE_ESQL_RULE_PROMPT } from './prompts';
import type { RuleCreationAnnotation } from '../iterative_agent/state';

interface CreateEsqlRuleNodeParams {
  model: InferenceChatModel;
}

export const createEsqlRuleNode = ({ model }: CreateEsqlRuleNodeParams) => {
  const jsonParser = new JsonOutputParser();
  const ruleCreationChain = CREATE_ESQL_RULE_PROMPT.pipe(model).pipe(jsonParser);
  return async (state: typeof RuleCreationAnnotation.State) => {
    try {
      const baseRuleParams = await ruleCreationChain.invoke({
        user_request: state.userQuery,
      });
      return { rule: { ...baseRuleParams, language: 'esql', type: 'esql' } };
    } catch (e) {
      return { error: e.message };
    }
  };
};
