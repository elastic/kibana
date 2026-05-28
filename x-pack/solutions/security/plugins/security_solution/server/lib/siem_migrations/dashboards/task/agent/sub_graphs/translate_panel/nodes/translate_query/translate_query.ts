/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatResourceWithSampledValues } from '@kbn/agent-builder-genai-utils';
import {
  getTranslateSplToEsql,
  TASK_DESCRIPTION,
  type GetTranslateSplToEsqlParams,
} from '../../../../../../../common/task/agent/helpers/translate_spl_to_esql';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';
import { hasValidIndexPattern } from '../../../../helpers/has_valid_index_pattern';
import type { GraphNode } from '../../types';

export const getTranslateQueryNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    if (!state.inline_query) {
      return {};
    }

    const description = `Dashboard description: "${state.dashboard_description}"
Specific Panel description: "${state.description}"`;

    const indexPattern = hasValidIndexPattern(state.index_pattern)
      ? state.index_pattern
      : TRANSLATION_INDEX_PATTERN;

    const indexResourceContext = state.resolved_resource
      ? formatResourceWithSampledValues({ resource: state.resolved_resource })
      : undefined;

    const { esqlQuery, comments } = await translateSplToEsql({
      title: state.parsed_panel.title,
      description,
      taskDescription: TASK_DESCRIPTION.migrate_dashboard,
      inlineQuery: state.inline_query,
      indexPattern,
      knowledgeBase: indexResourceContext ?? '',
    });

    if (!esqlQuery) {
      return { comments };
    }

    let finalQuery = esqlQuery;

    if (!hasValidIndexPattern(state.index_pattern)) {
      finalQuery = esqlQuery.replaceAll(
        TRANSLATION_INDEX_PATTERN,
        MISSING_INDEX_PATTERN_PLACEHOLDER
      );
    }

    return { esql_query: finalQuery, comments };
  };
};
