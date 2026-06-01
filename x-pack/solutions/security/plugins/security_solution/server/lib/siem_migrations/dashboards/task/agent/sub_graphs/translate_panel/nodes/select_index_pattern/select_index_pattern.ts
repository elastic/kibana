/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { indexExplorer } from '@kbn/agent-builder-genai-utils';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { generateAssistantComment } from '../../../../../../../common/task/util/comments';
import type { GraphNode, TranslatePanelGraphParams } from '../../types';
import { SELECT_INDEX_PATTERN_PROMPT } from './prompts';

const NO_INDEX_PATTERN_WARNING = `## ⚠️ No Valid Index Pattern Found

No matching Elasticsearch index pattern could be identified for this panel. This significantly impacts the quality of the translation:

- **Field names and types cannot be verified** against actual index mappings, which may lead to incorrect field references in the generated ES|QL query.
- **Query validation results may be unreliable** since there is no index to validate against.
- **The generated query will likely require manual corrections** to field names, types, and values before it can produce meaningful results.

**Recommendation:** Onboard the relevant data source into Elasticsearch and re-run the migration for more accurate results.`;

export const getSelectIndexPatternNode = (params: TranslatePanelGraphParams): GraphNode => {
  return async (state) => {
    if (!state.inline_query) {
      return {
        index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER,
        comments: [generateAssistantComment(NO_INDEX_PATTERN_WARNING)],
      };
    }

    const nlQuery = await SELECT_INDEX_PATTERN_PROMPT.format({
      title: state.parsed_panel.title,
      description: state.description,
      dashboard_description: state.dashboard_description,
      query: state.inline_query,
    });

    const response = await indexExplorer({
      nlQuery,
      limit: 1,
      esClient: params.esScopedClient.asCurrentUser,
      indexPattern: '*,-lookup*',
      model: {
        chatModel: params.model,
        connector: await params.inference.getConnectorById(params.connectorId, params.request),
        inferenceClient: params.inference.getClient({
          request: params.request,
          bindTo: { connectorId: params.connectorId },
        }),
      },
    });

    const indexPattern = response?.resources[0]?.name;

    if (!indexPattern) {
      return {
        index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER,
        comments: [generateAssistantComment(NO_INDEX_PATTERN_WARNING)],
      };
    }

    return { index_pattern: indexPattern };
  };
};
