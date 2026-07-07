/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EsqlKnowledgeBase } from '../../../../../../../common/task/util/esql_knowledge_base';
import type { ChatModel } from '../../../../../../../common/task/util/actions_client_chat';
import { EXTRACT_COLUMNS_ESQL_QUERY_TEMPLATE } from './prompts';
import type { EsqlColumn, GraphNode } from '../../types';

interface GetExtractColumnsFromEsqlQueryNodeParams {
  model: ChatModel;
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}

interface GetExtractColumnsFromEsqlQueryResponse {
  columns: EsqlColumn[];
}

export const getExtractColumnsFromEsqlQueryNode = ({
  model,
  esqlKnowledgeBase,
  logger,
}: GetExtractColumnsFromEsqlQueryNodeParams): GraphNode => {
  return async (state) => {
    const query = state.esql_query;
    if (!query) {
      return { esql_query_columns: undefined };
    }

    const prompt = await EXTRACT_COLUMNS_ESQL_QUERY_TEMPLATE.format({
      esql_query: query,
    });
    const response = await esqlKnowledgeBase.translate(prompt);
    const columns: EsqlColumn[] = [];

    try {
      const outputJsonStr = response.match(/```json\n([\s\S]*?)\n```/)?.[1];
      if (!outputJsonStr) {
        throw new Error('No ESQL Columns JSON found in the response');
      }
      const outputJson = JSON.parse(outputJsonStr) as GetExtractColumnsFromEsqlQueryResponse;

      columns.push(...outputJson.columns);
    } catch (e) {
      const message = `Failed to parse JSON when extracting columns from ES|QL query. Trying again: ${e}`;
      logger.error(message);
    }

    return { esql_query_columns: columns };
  };
};
