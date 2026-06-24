/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT } from './prompts';
import type { RuleCreationAnnotation, RejectionCode } from '../state';

interface CreateRuleNameAndDescriptionNodeParams {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
}

const isValidOutput = (result: { name?: unknown; description?: unknown }): boolean => {
  return (
    typeof result.name === 'string' &&
    result.name.trim().length > 0 &&
    typeof result.description === 'string' &&
    result.description.trim().length > 0
  );
};

export const createRuleNameAndDescriptionNode = ({
  model,
  events,
}: CreateRuleNameAndDescriptionNodeParams) => {
  const jsonParser = new JsonOutputParser<{ name: string; description: string }>();
  const ruleCreationChain =
    CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT.pipe(model).pipe(jsonParser);

  return async (state: typeof RuleCreationAnnotation.State) => {
    events?.reportProgress('Generating rule name and description...');

    const esqlQuery = state.rule.query;
    if (!esqlQuery) {
      return {
        errors: ['Cannot generate rule name and description: ES|QL query is missing'],
      };
    }

    try {
      const firstAttempt = await ruleCreationChain.invoke({
        user_request: state.userQuery,
        esql_query: esqlQuery,
      });

      if (isValidOutput(firstAttempt)) {
        events?.reportProgress('Rule name and description generated successfully');
        return { rule: firstAttempt };
      }

      events?.reportProgress('Retrying rule name and description generation with feedback...');

      const formattedMessages = await CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT.formatMessages({
        user_request: state.userQuery,
        esql_query: esqlQuery,
      });

      const retryResponse = await model.invoke([
        ...formattedMessages,
        new AIMessage(JSON.stringify(firstAttempt)),
        new HumanMessage(
          'Your previous response was missing or had empty "name" or "description" fields. ' +
            'Please provide a valid JSON object with non-empty "name" and "description" strings.'
        ),
      ]);

      const retryAttempt = await jsonParser.invoke(retryResponse);

      if (isValidOutput(retryAttempt)) {
        events?.reportProgress('Rule name and description generated successfully');
        return { rule: retryAttempt };
      }

      events?.reportProgress('Failed to generate valid rule name and description after retry');
      return {
        rejectionReason: {
          code: 'INVALID_OUTPUT' as RejectionCode,
          message: 'Generated rule name or description was empty or invalid after retry',
        },
      };
    } catch (e) {
      events?.reportProgress(`Failed to create rule name and description: ${e.message}`);
      return {
        errors: [`Failed to create rule name and description: ${e.message}`],
      };
    }
  };
};
