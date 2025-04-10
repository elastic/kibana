/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { START, StateGraph, Send, END } from '@langchain/langgraph';
import type {
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
} from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SelectIndexPatternAnnotation } from './state';
import {
  ANALYSE_INDEX_PATTERN,
  GET_INDEX_PATTERNS,
  SELECT_INDEX_PATTERN,
  SHORTLIST_INDEX_PATTERNS,
} from './constants';
import { fetchIndexPatterns } from './nodes/fetch_index_patterns/fetch_index_patterns';
import { getShortlistIndexPatterns } from './nodes/shortlist_index_patterns/shortlist_index_patterns';
import { getAnalyseIndexPattern } from './nodes/analyse_index_pattern/analyse_index_pattern';
import { getSelectIndexPattern } from './nodes/select_index/select_index';

export const getSelectIndexPatternGraph = ({
  createLlmInstance,
  esClient,
}: {
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
  esClient: ElasticsearchClient;
}) => {

  const graph = new StateGraph(SelectIndexPatternAnnotation)
    .addNode(GET_INDEX_PATTERNS, fetchIndexPatterns({ esClient }), {
      retryPolicy: { maxAttempts: 3 },
    })
    .addNode(SHORTLIST_INDEX_PATTERNS, getShortlistIndexPatterns({ createLlmInstance }), {
      retryPolicy: { maxAttempts: 3 },
    })
    .addNode(
      ANALYSE_INDEX_PATTERN,
      getAnalyseIndexPattern({
        esClient,
        createLlmInstance
      }),
      { retryPolicy: { maxAttempts: 3 } }
    )
    .addNode(SELECT_INDEX_PATTERN, getSelectIndexPattern({ createLlmInstance }), {
      retryPolicy: { maxAttempts: 3 },
    })

    .addEdge(START, GET_INDEX_PATTERNS)
    .addEdge(GET_INDEX_PATTERNS, SHORTLIST_INDEX_PATTERNS)
    .addConditionalEdges(
      SHORTLIST_INDEX_PATTERNS,
      (state: typeof SelectIndexPatternAnnotation.State) => {
        return state.shortlistedIndexPatterns.map(
          (indexPattern) =>
            new Send(ANALYSE_INDEX_PATTERN, {
              objectiveSummary: state.objectiveSummary,
              indexPattern,
            })
        );
      },
      {
        [ANALYSE_INDEX_PATTERN]: ANALYSE_INDEX_PATTERN,
      }
    )
    .addEdge(ANALYSE_INDEX_PATTERN, SELECT_INDEX_PATTERN)
    .addEdge(SELECT_INDEX_PATTERN, END)
    .compile();

  return graph;
};
