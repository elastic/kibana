/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { cleanMarkdown, generateAssistantComment } from '../../../../../util/comments';
import type { EsqlKnowledgeBase } from '../../../../../util/esql_knowledge_base';
import type { GraphNode } from '../../types';
import { ESQL_SYNTAX_TRANSLATION_PROMPT } from './prompts';
import {
  getElasticRiskScoreFromOriginalRule,
  getElasticSeverityFromOriginalRule,
} from './severity';

interface GetTranslateRuleNodeParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  logger: Logger;
}

export const getTranslateRuleNode = ({
  esqlKnowledgeBase,
  logger,
}: GetTranslateRuleNodeParams): GraphNode => {
  return async (state) => {
    const indexPatterns =
      state.integration?.data_streams?.map((dataStream) => dataStream.index_pattern).join(',') ||
      'logs-*';

    const splunkRule = {
      title: state.original_rule.title,
      description: state.original_rule.description,
      inline_query: state.inline_query,
    };

    const prompt = await ESQL_SYNTAX_TRANSLATION_PROMPT.format({
      splunk_rule: JSON.stringify(splunkRule, null, 2),
      indexPatterns,
    });
    const response = await esqlKnowledgeBase.translate(prompt);

    const esqlQuery = response.match(/```esql\n([\s\S]*?)\n```/)?.[1].trim() ?? '';
    if (!esqlQuery) {
      logger.warn('Failed to extract ESQL query from translation response');
      const comment =
        '## Translation Summary\n\nFailed to extract ESQL query from translation response';
      return {
        comments: [generateAssistantComment(comment)],
      };
    }

    const translationSummary = response.match(/## Translation Summary[\s\S]*$/)?.[0] ?? '';

    return {
      comments: [generateAssistantComment(cleanMarkdown(translationSummary))],
      elastic_rule: {
        query: esqlQuery,
        query_language: 'esql',
        risk_score: getElasticRiskScoreFromOriginalRule(state.original_rule),
        severity: getElasticSeverityFromOriginalRule(state.original_rule),
        ...(state.integration?.id && { integration_ids: [state.integration.id] }),
      },
    };
  };
};
