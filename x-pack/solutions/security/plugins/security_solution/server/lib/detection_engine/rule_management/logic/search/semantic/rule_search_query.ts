/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RetrieverContainer } from '@elastic/elasticsearch/lib/api/types';
import { RULE_SEARCH_INDEX, RULE_SEARCH_RERANK_ID } from './rule_search_index';
import type { RuleSearchModels } from './rule_search_index';

/** Candidates for fusion and for the reranker; a space has at most 10,000 rules. */
const RANK_WINDOW = 200;
const RERANK_WINDOW = 100;
/**
 * The relevant set, after the reranker: a rule stays when its score reaches both an absolute
 * minimum and a share of the best score. The reranker's scale is not documented; on test queries
 * (demo-custom, 8,066 rules) relevant rules scored about 1.0–1.7 and unrelated ones 0.84–0.95.
 */
const MIN_SCORE = 1.0;
const RELATIVE_SCORE = 0.6;

export interface RankedRule {
  soId: string;
  score: number;
}

/**
 * The relevant rules for a text, best first: one search by words (exact names, MITRE ids,
 * descriptions, queries) and one by meaning (the rule card), fused with RRF, then reranked.
 * Returns saved object ids only; the caller loads the rules through RulesClient as the user.
 */
export const searchRelevantRuleIds = async ({
  esClient,
  spaceId,
  term,
  models,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  term: string;
  models: RuleSearchModels;
}): Promise<RankedRule[]> => {
  const inSpace = [{ term: { space_id: spaceId } }];
  const byWords: RetrieverContainer = {
    standard: {
      query: {
        bool: {
          filter: inSpace,
          should: [
            {
              multi_match: {
                query: term,
                fields: ['name^3', 'mitre_names^2', 'description', 'tags', 'query'],
              },
            },
            { match: { ids: { query: term, boost: 5 } } },
          ],
          minimum_should_match: 1,
        },
      },
    },
  };
  const byMeaning: RetrieverContainer = {
    standard: {
      query: {
        bool: { filter: inSpace, must: [{ semantic: { field: 'rule_card', query: term } }] },
      },
    },
  };
  const fused: RetrieverContainer = {
    rrf: { retrievers: [byWords, byMeaning], rank_window_size: RANK_WINDOW },
  };
  const retriever: RetrieverContainer = models.rerank
    ? {
        text_similarity_reranker: {
          retriever: fused,
          field: 'card',
          inference_id: RULE_SEARCH_RERANK_ID,
          inference_text: term,
          rank_window_size: RERANK_WINDOW,
        },
      }
    : fused;

  const result = await esClient.search<{ so_id: string }>({
    index: RULE_SEARCH_INDEX,
    size: models.rerank ? RERANK_WINDOW : RANK_WINDOW,
    _source: ['so_id'],
    retriever,
  });
  const ranked = result.hits.hits.flatMap((hit) =>
    hit._source ? [{ soId: hit._source.so_id, score: hit._score ?? 0 }] : []
  );
  if (!models.rerank || ranked.length === 0) {
    return ranked;
  }
  const cut = Math.max(MIN_SCORE, ranked[0].score * RELATIVE_SCORE);
  return ranked.filter(({ score }) => score >= cut);
};
