/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { START, StateGraph, Send, END } from '@langchain/langgraph';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SelectIndexPatternAnnotation } from './state';
import {
  ANALYZE_INDEX_PATTERN,
  GET_INDEX_PATTERNS,
  SELECT_INDEX_PATTERN,
  SHORTLIST_INDEX_PATTERNS,
} from './constants';
import { fetchIndexPatterns } from './nodes/fetch_index_patterns/fetch_index_patterns';
import { getShortlistIndexPatterns } from './nodes/shortlist_index_patterns/shortlist_index_patterns';
import { getAnalyzeIndexPattern } from './nodes/analyse_index_pattern/analyse_index_pattern';
import { getSelectIndexPattern } from './nodes/select_index/select_index';
import { getAnalyzeIndexPatternGraph } from '../analyse_index_pattern/analyse_index_pattern';
import type { CreateLlmInstance } from '../../utils/common';

export const getSelectIndexPatternGraph = async ({
  createLlmInstance,
  esClient,
}: {
  createLlmInstance: CreateLlmInstance;
  esClient: ElasticsearchClient;
}) => {
  const [analyzeIndexPatternGraph, shortlistIndexPatterns] = await Promise.all([
    getAnalyzeIndexPatternGraph({
      esClient,
      createLlmInstance,
    }),
    getShortlistIndexPatterns({
      createLlmInstance,
    }),
  ]);

  const graph = new StateGraph(SelectIndexPatternAnnotation)
    .addNode(GET_INDEX_PATTERNS, fetchIndexPatterns({ esClient }), {
      retryPolicy: { maxAttempts: 3 },
    })
    .addNode(SHORTLIST_INDEX_PATTERNS, shortlistIndexPatterns)
    .addNode(
      ANALYZE_INDEX_PATTERN,
      getAnalyzeIndexPattern({
        analyzeIndexPatternGraph,
      }),
      { retryPolicy: { maxAttempts: 3 }, subgraphs: [analyzeIndexPatternGraph] }
    )
    .addNode(SELECT_INDEX_PATTERN, getSelectIndexPattern(), {
      retryPolicy: { maxAttempts: 3 },
    })

    .addEdge(START, GET_INDEX_PATTERNS)
    .addEdge(GET_INDEX_PATTERNS, SHORTLIST_INDEX_PATTERNS)
    .addConditionalEdges(
      SHORTLIST_INDEX_PATTERNS,
      (state: typeof SelectIndexPatternAnnotation.State) => {
        const { input } = state;
        if (input === undefined) {
          throw new Error('State input is undefined');
        }
        if (state.shortlistedIndexPatterns.length === 0) {
          return END;
        }
        return state.shortlistedIndexPatterns.map((indexPattern) => {
          return new Send(ANALYZE_INDEX_PATTERN, {
            input: {
              question: input.question,
              indexPattern,
            },
          });
        });
      },
      {
        [ANALYZE_INDEX_PATTERN]: ANALYZE_INDEX_PATTERN,
        [END]: END,
      }
    )
    .addEdge(ANALYZE_INDEX_PATTERN, SELECT_INDEX_PATTERN)
    .addEdge(SELECT_INDEX_PATTERN, END)
    .compile();

  return graph;
};
