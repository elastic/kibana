/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/onechat-server';
import type { OperationObject } from '../../utils/openapi_tool_set';

export const searchElasticsearchApiDocs = async (
  query: string,
  esClient: ToolHandlerContext['esClient']
): Promise<OperationObject[]> => {
  const esApiDocResponse = await esClient.asCurrentUser.search({
    index: 'kibana_ai_es_api_doc',
    size: 5,
    query: {
      bool: {
        should: [
          // Semantic matches (highest boost for understanding intent)
          { semantic: { field: 'summary', query, boost: 5 } },
          { semantic: { field: 'description', query, boost: 4 } },
          { semantic: { field: 'endpoint', query, boost: 3 } },

          // Lexical matches with phrase matching for better precision
          {
            match_phrase: {
              summary_text: {
                query,
                boost: 3,
                slop: 3,
              },
            },
          },
          {
            match_phrase: {
              description_text: {
                query,
                boost: 2.5,
                slop: 5,
              },
            },
          },
          {
            match: {
              summary_text: {
                query,
                boost: 2,
                operator: 'and',
              },
            },
          },
          {
            match: {
              description_text: {
                query,
                boost: 1.5,
                operator: 'and',
              },
            },
          },
          {
            match: {
              operationId: {
                query,
                boost: 1.5,
                fuzziness: 'AUTO',
              },
            },
          },
          {
            match: {
              path: {
                query,
                boost: 1.2,
              },
            },
          },
        ],
        // Require at least 2 conditions to match for better precision
        minimum_should_match: 2,
      },
    },
    // Only return documents with a minimum score to filter out weak matches
    min_score: 5,
  });

  return (
    esApiDocResponse as { hits: { hits: Array<{ _source: OperationObject }> } }
  ).hits.hits.map((hit) => hit._source);
};
