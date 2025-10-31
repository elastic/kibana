/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import type { InferenceChatModel } from '@kbn/inference-langchain';

import type { RuleCreationAnnotation } from '../../../state';
import { getGenerateEsqlGraph } from '../../../../../../../assistant/tools/esql/graphs/generate_esql/generate_esql';
interface CreateEsqlRuleNodeParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: () => Promise<InferenceChatModel>;
}

export const createEsqQueryNode = async ({
  model,
  esClient,
  connectorId,
  inference,
  logger,
  request,
  createLlmInstance,
}: CreateEsqlRuleNodeParams) => {
  const selfHealingGraph = await getGenerateEsqlGraph({
    esClient,
    connectorId,
    inference,
    logger,
    request,
    createLlmInstance,
  });

  // const ruleCreationChain = CREATE_ESQL_RULE_PROMPT.pipe(model).pipe(jsonParser);
  return async (state: typeof RuleCreationAnnotation.State) => {
    try {
      const result = await selfHealingGraph.invoke(
        {
          //   messages: [
          //     new HumanMessage({
          //       content: `You are a helpful assistant that helps in creating Elastic Detection(SIEM) rules of ES|QL type, based on provided user request by understanding the intent of the user query and generating a concise and relevant ES|QL query that aligns with the user's intent
          //       Generate the ES|QL Query: Provide a complete ES|QL query tailored to the stated goal.
          //       Optimize for Elastic Security: Suggest additional filters, aggregations, or enhancements to make the query more efficient and actionable within Elastic Security workflows.

          //       If generated query does not have any aggregations(using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command`,
          //     }),
          //   ],
          input: {
            question: state.userQuery,
          },
        },
        { recursionLimit: 30 }
      );
      const { messages } = result;
      const lastMessage = messages[messages.length - 1];
      return { rule: { query: lastMessage.content, language: 'esql', type: 'esql' } };
    } catch (e) {
      return { error: e.message };
    }
  };
};
