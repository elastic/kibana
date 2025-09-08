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
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';
import type { GraphNode } from '../../types';

export const getTranslateQueryNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    if (!state.inline_query) {
      return {};
    }

    const description = `Dashboard description: "${state.dashboard_description}"
Specific Panel description: "${state.description}"`;

    const { esqlQuery, comments } = await translateSplToEsql({
      title: state.parsed_panel.title,
      description,
      taskDescription: TASK_DESCRIPTION.migrate_dashboard,
      inlineQuery: state.inline_query,
      indexPattern: TRANSLATION_INDEX_PATTERN,
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
