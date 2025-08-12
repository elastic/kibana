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
} from '../../../../../../../common/task/agent/tools/translate_spl_to_esql';
import type { GraphNode } from '../../types';

export const getTranslateQueryNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    const { title, description = '' } = state.original_panel;
    const { esqlQuery, comments } = await translateSplToEsql({
      title,
      description,
      taskDescription: TASK_DESCRIPTION.migrate_dashboard,
      inlineQuery: state.inline_query,
      indexPattern: 'logs-*', // The index_pattern state is still undefined at this point
    });

    if (!esqlQuery) {
      return { comments };
    }

    return {
      elastic_panel: {
        title,
        description,
        query: esqlQuery,
        query_language: 'esql',
      },
      comments,
    };
  };
};
