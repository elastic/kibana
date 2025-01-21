/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { getEsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base_caller';
import type { GraphNode } from '../../types';
import { ESQL_SYNTAX_TRANSLATION_PROMPT } from './prompts';
import { cleanMarkdown } from '../../../../../util/comments';

interface GetTranslateRuleNodeParams {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}

export const getTranslateRuleNode = ({
  inferenceClient,
  connectorId,
  logger,
}: GetTranslateRuleNodeParams): GraphNode => {
  const esqlKnowledgeBaseCaller = getEsqlKnowledgeBase({ inferenceClient, connectorId, logger });
  return async (state) => {
    const indexPatterns =
      state.integration?.data_streams?.map((dataStream) => dataStream.index_pattern).join(',') ||
      'logs-*';
    const integrationId = state.integration?.id || '';

    const splunkRule = {
      title: state.original_rule.title,
      description: state.original_rule.description,
      inline_query: state.inline_query,
    };

    const prompt = await ESQL_SYNTAX_TRANSLATION_PROMPT.format({
      splunk_rule: JSON.stringify(splunkRule, null, 2),
      indexPatterns,
    });
    const response = await esqlKnowledgeBaseCaller(prompt);

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1].trim() ?? '';
    const translationSummary = response.match(/## Translation Summary[\s\S]*$/)?.[0] ?? '';

    return {
      response,
      comments: [cleanMarkdown(translationSummary)],
      elastic_rule: {
        integration_ids: [integrationId],
        query: esqlQuery,
        query_language: 'esql',
      },
    };
  };
};
