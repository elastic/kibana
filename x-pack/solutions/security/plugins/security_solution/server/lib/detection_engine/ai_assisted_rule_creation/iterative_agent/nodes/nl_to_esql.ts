/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import type { InferenceClient } from '@kbn/inference-common';
import { lastValueFrom } from 'rxjs';
import {
  messagesToInference,
  toolDefinitionToInference,
} from '@kbn/inference-langchain/src/chat_model/to_inference';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { User } from '@kbn/elastic-assistant-common';
import { UserMessages } from '@kbn/lens-plugin/public/react_embeddable/user_messages/container';
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';
import type { RuleCreationAnnotation } from '../state';
import { getGenerateEsqlGraph } from '../../../../../assistant/tools/esql/graphs/generate_esql/generate_esql';
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
          // input: state.userQuery,
          logger,
          messages: messagesToInference([
            new HumanMessage(
              `You are a helpful assistant that helps in creating Elastic Detection(SIEM) rules of ES|QL type, based on provided user request by understanding the intent of the user query and generating a concise and relevant ES|QL query that aligns with the user's intent
              Generate the ES|QL Query: Provide a complete ES|QL query tailored to the stated goal.
              Optimize for Elastic Security: Suggest additional filters, aggregations, or enhancements to make the query more efficient and actionable within Elastic Security workflows.

              Guidelines:
              - If generated query does not have any aggregations(using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command
              - In command FROM use only listed indices: ${state.indices.shortlistedIndexPatterns.join(
                ', '
              )} if they satisfy requirements`
            ),
            new HumanMessage(
              `Any referred field in command should exist in any index referred in FROM command.
              Use for reference:

              ${indexPatternsContext.join('')}
              `
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
      return { error: e.message };
    }
  };
};
