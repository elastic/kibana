/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RetrieverContainer } from '@elastic/elasticsearch/lib/api/types';
import { RULE_SEARCH_INDEX, RULE_SEARCH_RERANK_ID } from './rule_search_index';

/** Candidates for fusion and for the reranker; a space has at most 10,000 rules. */
const RANK_WINDOW = 200;
/**
 * The reranker reads this many candidates. A listwise reranker gets worse on long lists, and its
 * cost and time grow with the window; it is also the most rules a search by meaning can show.
 */
const RERANK_WINDOW = 50;
/**
 * The relevant set, after the reranker: a rule stays when its score reaches both an absolute
 * minimum and a share of the best score. The scale depends on the model and the window, so both
 * values are calibrated again when either changes. Text with no answer among the rules scores
 * 0.87–1.11 at best, relevant rules up to about 1.5.
 */
const MIN_SCORE = 1.0;
const RELATIVE_SCORE = 0.6;
/** A search by meaning that takes longer falls back to the keyword search. */
const SEARCH_TIMEOUT_MS = 5_000;

/** Where in the rule card a snippet comes from. */
export type RuleSearchSnippetSource =
  | 'description'
  | 'mitre'
  | 'integrations'
  | 'false_positives'
  | 'index_patterns';

export interface RuleSearchSnippet {
  text: string;
  source: RuleSearchSnippetSource;
}

export interface RankedRule {
  soId: string;
  score: number;
  /** The sentence of the rule card that is closest in meaning to the text. */
  snippet?: RuleSearchSnippet;
}

const SNIPPET_LENGTH = 240;

/** The labels of the rule card lines (`rule_search_document.ts`). */
const CARD_LINES: Array<[string, RuleSearchSnippetSource]> = [
  ['MITRE ATT&CK:', 'mitre'],
  ['Integrations:', 'integrations'],
  ['False positives:', 'false_positives'],
  ['Index patterns:', 'index_patterns'],
];

/**
 * A chunk of the rule card as one readable line with its source: the first line of the chunk
 * that is not the rule name (the table shows it), without its label, cut at a word.
 */
const toSnippet = (chunk: string, name: string): RuleSearchSnippet | undefined => {
  const line = chunk
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && l.toLowerCase() !== name.toLowerCase());
  if (!line) return undefined;
  const [label, source] = CARD_LINES.find(([prefix]) => line.startsWith(prefix)) ?? [
    '',
    'description' as const,
  ];
  let text = line.slice(label.length).replace(/`+/g, '').replace(/\s+/g, ' ').trim();
  if (text.toLowerCase().startsWith(name.toLowerCase())) {
    text = text.slice(name.length).trim();
  }
  // A long sentence is cut into chunks: a chunk can start in the middle of it.
  if (source === 'description' && /^[^A-Z0-9"“(]/.test(text)) {
    text = `…${text.replace(/^[\s,;:.)\]-]+/, '')}`;
  }
  if (!text) return undefined;
  if (text.length > SNIPPET_LENGTH) {
    const cut = text.lastIndexOf(' ', SNIPPET_LENGTH);
    text = `${text.slice(0, cut > 0 ? cut : SNIPPET_LENGTH)}…`;
  }
  return { text, source };
};

/**
 * The relevant rules for a text, best first: one search by words (exact names, MITRE ids,
 * descriptions, queries) and one by meaning (the rule card), fused with RRF, then reranked.
 * Returns saved object ids only; the caller loads the rules through RulesClient as the user.
 */
export const searchRelevantRuleIds = async ({
  esClient,
  spaceId,
  term,
  candidateIds,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  term: string;
  /** Rank only these rules (saved object ids): the rules that the filters of the page keep. */
  candidateIds?: string[];
}): Promise<RankedRule[]> => {
  const inSpace = [
    { term: { space_id: spaceId } },
    ...(candidateIds ? [{ terms: { so_id: candidateIds } }] : []),
  ];
  const byWords: RetrieverContainer = {
    standard: {
      query: {
        bool: {
          filter: inSpace,
          should: [
            {
              multi_match: {
                query: term,
                fields: [
                  'name^3',
                  'mitre_names^2',
                  'description',
                  'tags',
                  'query',
                  'index_patterns',
                  'note',
                  'setup',
                ],
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
  const retriever: RetrieverContainer = {
    text_similarity_reranker: {
      retriever: fused,
      field: 'card',
      inference_id: RULE_SEARCH_RERANK_ID,
      inference_text: term,
      rank_window_size: RERANK_WINDOW,
    },
  };

  const result = await esClient.search<{ so_id: string; name: string }>(
    {
      index: RULE_SEARCH_INDEX,
      size: RERANK_WINDOW,
      _source: ['so_id', 'name'],
      retriever,
      highlight: {
        fields: {
          explain_card: {
            type: 'semantic',
            number_of_fragments: 1,
            order: 'score',
            highlight_query: { semantic: { field: 'explain_card', query: term } },
          },
        },
      },
    },
    { requestTimeout: SEARCH_TIMEOUT_MS }
  );
  const ranked = result.hits.hits.flatMap((hit) => {
    if (!hit._source) return [];
    const chunk = hit.highlight?.explain_card?.[0];
    return [
      {
        soId: hit._source.so_id,
        score: hit._score ?? 0,
        snippet: chunk ? toSnippet(chunk, hit._source.name) : undefined,
      },
    ];
  });
  if (ranked.length === 0) {
    return ranked;
  }
  const cut = Math.max(MIN_SCORE, ranked[0].score * RELATIVE_SCORE);
  return ranked.filter(({ score }) => score >= cut);
};
