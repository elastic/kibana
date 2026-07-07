/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import type { RuleCreationState } from '../../../state';

interface GenerateEsqlQueryParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  events?: ToolEventEmitter;
}

export const generateEsqlQueryNode = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  events,
  model,
}: GenerateEsqlQueryParams) => {
  return async (state: RuleCreationState) => {
    events?.reportProgress('Generating ES|QL query from natural language...');

    try {
      const inferenceClient = inference.getClient({
        request,
        bindTo: { connectorId },
      });
      const connector = await inferenceClient.getConnectorById(connectorId);

      // Build security-specific instructions for ES|QL query generation
      const additionalInstructions = `
Your role to is to help in creating Elastic Detection (SIEM) rules of ES|QL type, based on provided user request by understanding the intent of the user query and generating a concise and relevant ES|QL query that aligns with the user's intent.

Generate the ES|QL Query: Provide a complete ES|QL query tailored to the stated goal.

Guidelines for ES|QL query generation:
- If generated query does not have any aggregations (using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command
- Do not use any date range filters in the query (like WHERE @timestamp > NOW() - 5 minutes) or bucket aggregation limited by time (COUNT(*) BY bucket = BUCKET(@timestamp, 10 minutes)), unless explicitly told to include them in query. The system will handle time range filtering separately.
- Never include bucket aggregation limited by time (like this example COUNT(*) BY bucket = BUCKET(@timestamp, 10 minutes)), to avoid clash with scheduling of the detection rule.
- If you use KEEP command, after METADATA operator, make sure to include _id field.
- If there is no relevant data in provided index patterns context to fulfil user request, use the best effort to create query based on your knowledge of ES|QL and security detection use cases.
- Ensure the query is syntactically correct and adheres to ES|QL standards.
- Do not include any explanations, only provide the ES|QL query string.
- When referring to fields take into account their data types as well. For example, do not use text field in arithmetic operations.
- Use only full name of the fields in referred index patterns context. Name should contain all parent nodes separated by dot. For example use "host.name" instead of just "name".

Optimize for Elastic Security: Suggest additional filters, aggregations, or enhancements to make the query more efficient and actionable within Elastic Security workflows.
`;

      // Use provided events or create a no-op event emitter as fallback
      const toolEvents: ToolEventEmitter = events || {
        reportProgress: () => {},
        sendUiEvent: () => {},
      };

      // Generate ES|QL query using agent_builder tool
      const esqlResponse = await generateEsql({
        nlQuery: state.userQuery,
        additionalInstructions,
        executeQuery: false,
        maxRetries: 3,
        model: { chatModel: model as ScopedModel['chatModel'], inferenceClient, connector },
        esClient,
        logger,
        events: toolEvents,
      });

      if (esqlResponse.error) {
        events?.reportProgress(`Failed to generate ES|QL query: ${esqlResponse.error}`);
        return {
          ...state,
          errors: [`Failed to generate ES|QL query: ${esqlResponse.error}`],
        };
      }

      if (!esqlResponse.query) {
        events?.reportProgress('Generated ES|QL query is empty');
        return {
          ...state,
          errors: ['Generated ES|QL query is empty'],
        };
      }

      events?.reportProgress(`ES|QL query generated successfully: "${esqlResponse.query}"`);

      return {
        ...state,
        rule: {
          query: esqlResponse.query,
          language: 'esql',
          type: 'esql',
        },
      };
    } catch (err) {
      logger.error(`Error generating ES|QL query: ${err.message}`, err);
      events?.reportProgress(`Failed to generate ES|QL query: ${err.message}`);
      return {
        ...state,
        errors: [`Failed to generate ES|QL query: ${err.message}`],
      };
    }
  };
};
