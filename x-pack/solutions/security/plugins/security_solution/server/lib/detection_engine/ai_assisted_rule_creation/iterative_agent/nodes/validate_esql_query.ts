/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreationState } from '../state';
// interface CreateEsqlRuleNodeParams {
//   //   model: InferenceChatModel;
//   //   esClient: ElasticsearchClient;
//   //   connectorId: string;
//   //   inference: InferenceServerStart;
//   //   logger: Logger;
//   //   request: KibanaRequest;
//   //   createLlmInstance: () => Promise<InferenceChatModel>;
// }

export const validateEsqlQueryNode = () => {
  return async (state: RuleCreationState) => {
    try {
      const match = state.rule.query.match(/```esql\s*([\s\S]*?)```/);
      const esql = match ? match[1].trim() : undefined;

      return { ...state, rule: { ...state.rule, query: esql } };
    } catch (e) {
      return { error: e.message };
    }
  };
};
