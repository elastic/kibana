/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { User } from '@kbn/elastic-assistant-common';
import { UserMessages } from '@kbn/lens-plugin/public/react_embeddable/user_messages/container';
import type { RuleCreationAnnotation } from '../state';
import { getGenerateEsqlGraph } from '../../../../../assistant/tools/esql/graphs/generate_esql/generate_esql';
interface CreateEsqlRuleNodeParams {
  //   model: InferenceChatModel;
  //   esClient: ElasticsearchClient;
  //   connectorId: string;
  //   inference: InferenceServerStart;
  //   logger: Logger;
  //   request: KibanaRequest;
  //   createLlmInstance: () => Promise<InferenceChatModel>;
}

export const validateEsqlQueryNode = ({}: CreateEsqlRuleNodeParams) => {
  // const ruleCreationChain = CREATE_ESQL_RULE_PROMPT.pipe(model).pipe(jsonParser);
  return async (state: typeof RuleCreationAnnotation.State) => {
    try {
      const match = state.rule.query.match(/```esql\s*([\s\S]*?)```/);
      const esql = match ? match[1].trim() : undefined;

      return { ...state, rule: { ...state.rule, query: esql } };
    } catch (e) {
      return { error: e.message };
    }
  };
};
