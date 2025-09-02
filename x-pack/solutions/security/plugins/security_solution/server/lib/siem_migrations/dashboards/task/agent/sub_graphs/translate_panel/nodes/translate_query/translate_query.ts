/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import {
  getTranslateSplToEsql,
  TASK_DESCRIPTION,
  type GetTranslateSplToEsqlParams,
} from '../../../../../../../common/task/agent/helpers/translate_spl_to_esql';
import type { GraphNode } from '../../types';

export const getTranslateQueryNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    if (!state.inline_query) {
      return {};
    }
    const { esqlQuery, comments } = await translateSplToEsql({
      title: state.parsed_panel.title,
      description: state.description ?? '',
      taskDescription: TASK_DESCRIPTION.migrate_dashboard,
      inlineQuery: state.inline_query,
      indexPattern: state.index_pattern || MISSING_INDEX_PATTERN_PLACEHOLDER,
    });

    if (!esqlQuery) {
      return { comments };
    }

    return {
      esql_query: esqlQuery,
      comments,
    };
  };
};
