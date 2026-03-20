/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT } from './prompts';
import type { RuleCreationAnnotation } from '../state';

interface CreateRuleNameAndDescriptionNodeParams {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}

export const createRuleNameAndDescriptionNode = ({
  model,
  events,
}: CreateRuleNameAndDescriptionNodeParams) => {
  const jsonParser = new JsonOutputParser<{ name: string; description: string }>();
  const ruleCreationChain =
    CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT.pipe(model).pipe(jsonParser);
  return async (state: typeof RuleCreationAnnotation.State) => {
    events?.reportProgress('Generating rule name and description...');

    try {
      const baseRuleParams = await ruleCreationChain.invoke({
        user_request: state.userQuery,
        esql_query: state.rule.query,
      });

      events?.reportProgress('Rule name and description generated successfully');

      return {
        ...state,
        rule: baseRuleParams,
      };
    } catch (e) {
      events?.reportProgress(`Failed to create rule name and description: ${e.message}`);
      return {
        ...state,
        criticalErrors: [`Failed to create rule name and description: ${e.message}`],
      };
    }
  };
};
