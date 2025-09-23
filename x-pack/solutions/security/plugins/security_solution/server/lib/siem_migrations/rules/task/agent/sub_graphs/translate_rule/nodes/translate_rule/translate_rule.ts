/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getTranslateSplToEsql,
  TASK_DESCRIPTION,
  type GetTranslateSplToEsqlParams,
} from '../../../../../../../common/task/agent/helpers/translate_spl_to_esql';
import type { GraphNode } from '../../types';
import {
  getElasticRiskScoreFromOriginalRule,
  getElasticSeverityFromOriginalRule,
} from './severity';

export const getTranslateRuleNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    const indexPatterns =
      state.integration?.data_streams?.map((dataStream) => dataStream.index_pattern).join(',') ||
      'logs-*';

    const { esqlQuery, comments } = await translateSplToEsql({
      title: state.original_rule.title,
      taskDescription: TASK_DESCRIPTION.migrate_rule,
      description: state.original_rule.description,
      inlineQuery: state.inline_query,
      indexPattern: indexPatterns,
    });

    if (!esqlQuery) {
      return { comments };
    }

    return {
      elastic_rule: {
        query: esqlQuery,
        query_language: 'esql',
        risk_score: getElasticRiskScoreFromOriginalRule(state.original_rule),
        severity: getElasticSeverityFromOriginalRule(state.original_rule),
        ...(state.integration?.id && { integration_ids: [state.integration.id] }),
      },
      comments,
    };
  };
};
