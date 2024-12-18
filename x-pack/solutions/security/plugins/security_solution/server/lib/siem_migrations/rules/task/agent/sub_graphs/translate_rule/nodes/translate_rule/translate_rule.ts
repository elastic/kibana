/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { RuleTranslationResult } from '../../../../../../../../../../common/siem_migrations/constants';
import { getEsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base_caller';
import type { GraphNode } from '../../types';
import { ESQL_SYNTAX_TRANSLATION_PROMPT } from './prompts';

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

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1] ?? '';
    const translationSummary = response.match(/## Translation Summary[\s\S]*$/)?.[0] ?? '';

    const translationResult = getTranslationResult(esqlQuery);

    return {
      response,
      comments: [translationSummary],
      translation_result: translationResult,
      elastic_rule: {
        title: state.original_rule.title,
        integration_id: integrationId,
        description: state.original_rule.description,
        severity: 'low',
        query: esqlQuery,
        query_language: 'esql',
      },
    };
  };
};

const getTranslationResult = (esqlQuery: string): RuleTranslationResult => {
  if (esqlQuery.match(/\[(macro):[\s\S]*\]/)) {
    return RuleTranslationResult.PARTIAL;
  }
  return RuleTranslationResult.FULL;
};
