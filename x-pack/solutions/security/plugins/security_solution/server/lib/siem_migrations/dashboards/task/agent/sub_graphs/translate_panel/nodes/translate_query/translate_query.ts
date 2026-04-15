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
import type { GraphNode } from '../../types';

export const getTranslateQueryNode = (params: GetTranslateSplToEsqlParams): GraphNode => {
  const translateSplToEsql = getTranslateSplToEsql(params);
  return async (state) => {
    if (!state.inline_query) {
      return {};
    }

    const description = `Dashboard description: "${state.dashboard_description}"
Specific Panel description: "${state.description}"`;

    const indexPattern =
      !state.index_pattern || state.index_pattern === MISSING_INDEX_PATTERN_PLACEHOLDER
        ? TRANSLATION_INDEX_PATTERN
        : state.index_pattern;

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

    const isMissingIndex =
      !state.index_pattern || state.index_pattern === MISSING_INDEX_PATTERN_PLACEHOLDER;

    if (!isMissingIndex) {
      return { esql_query: esqlQuery, comments };
    }

    const replaceIndexPattern = (text: string) =>
      text.replaceAll(TRANSLATION_INDEX_PATTERN, MISSING_INDEX_PATTERN_PLACEHOLDER);

    return {
      esql_query: replaceIndexPattern(esqlQuery),
      comments: comments?.map((c) => ({ ...c, message: replaceIndexPattern(c.message) })),
    };
  };
};
