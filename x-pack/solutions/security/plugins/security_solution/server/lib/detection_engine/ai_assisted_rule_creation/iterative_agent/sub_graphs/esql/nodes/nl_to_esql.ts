/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';
import { messagesToInference } from '@kbn/inference-langchain/src/chat_model/to_inference';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { HumanMessage } from '@langchain/core/messages';

import type { RuleCreationAnnotation } from '../../../state';

interface CreateEsqlRuleNodeParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: () => Promise<InferenceChatModel>;
}

export const nlToEsqlQueryNode = async ({
  model,
  esClient,
  connectorId,
  inference,
  logger,
  request,
  createLlmInstance,
}: CreateEsqlRuleNodeParams) => {
  // const ruleCreationChain = CREATE_ESQL_RULE_PROMPT.pipe(model).pipe(jsonParser);
  return async (state: typeof RuleCreationAnnotation.State) => {
    try {
      const indexPatternsContext = Object.values(state.indices.indexPatternAnalysis).map(
        ({ indexPattern, context }) => `${indexPattern}: ${context}.\n`
      );

      const { content } = await lastValueFrom(
        naturalLanguageToEsql({
          client: inference.getClient({ request }),
          connectorId,
          logger,
          messages: messagesToInference([
            new HumanMessage(
              `You are a helpful assistant that helps in creating Elastic Detection(SIEM) rules of ES|QL type, based on provided user request by understanding the intent of the user query and generating a concise and relevant ES|QL query that aligns with the user's intent
              Generate the ES|QL Query: Provide a complete ES|QL query tailored to the stated goal.
              Optimize for Elastic Security: Suggest additional filters, aggregations, or enhancements to make the query more efficient and actionable within Elastic Security workflows.

              Guidelines:
              - If generated query does not have any aggregations(using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command
              - If you use KEEP command, after METADATA operator, make sure to include _id field. 
              - In command FROM use only listed indices: ${state.indices.shortlistedIndexPatterns.join(
                ', '
              )}
              - Ensure the query is syntactically correct and adheres to ES|QL standards.
              - Do not include any explanations, only provide the ES|QL query string.
              - Any referred field in ES|QL command must exist in list of fields for given index patterns context:
                ${indexPatternsContext.join('')}
              - Each line in index patterns context represents single hierarchy branch of properties.
              For example: 
              agent:{ephemeral_id,id,name,type,version:keyword,build:{original:keyword}}
              can be transformed into
              agent.ephemeral_id:keyword, agent.id:keyword, agent.name:keyword, agent.type:keyword, agent.version:keyword, agent.build.original:keyword
              Always use fields in query that exist in index patterns context after their transformation in "." notation view
              - when referring to fields take into account their data types as well. For example, do not use text field in arithmetic operations.
              - use only full name of the fields in referred index patterns context. Name should contain all parent nodes separated by dot. For example use "host.name" instead of just "name". Each new line separated by new line symbol in index patterns context represents a full branch of fields hierarchy.
              - Do not include any fields that do not exist in the provided index patterns context.
              - Use knowledge base context to enhance the query if it is available and relevant to the user query.
              Knowledge base context: ${state.knowledgeBaseContext ?? 'N/A'}`
            ),
            new HumanMessage({ content: state.userQuery }),
          ]).messages,
        })
      );
      //   return content;

      //   const { messages } = result;
      //   const lastMessage = messages[messages.length - 1];
      return { ...state, rule: { query: content, language: 'esql', type: 'esql' } };
    } catch (e) {
      return { ...state, error: e.message };
    }
  };
};
