/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DecisionTreeView } from '@kbn/nightshift-decision-trees';
import { extractMermaid, parseStoredDecisionTree } from '@kbn/nightshift-decision-trees';
import { getErrorMessage } from '../errors';

/**
 * Investigations keep three kinds of knowledge as Context Engine AI indices, scoped by
 * `attributes.space_id`. Nightshift Investigations exposes no server contract for them, so the
 * engine reads the indices directly, read-only, as the user. What they hold was written by an AI with no
 * review: it informs the agent and seeds candidates, and it is never a label.
 */
const DECISION_TREE_INDEX = 'ai-index-idx-nightshift-decision-trees';
const SEMANTIC_MEMORY_INDEX = 'ai-index-idx-nightshift-semantic-memory';
const CORTEX_INDEX = 'ai-index-idx-nightshift-cortex';

const MAX_TREES = 200;
const MAX_VERSIONS = 2_000;
/** Pages one case shows; the case stays bounded however much investigations wrote. */
const MAX_PAGES_PER_CASE = 3;
const MAX_PAGE_TEXT = 600;
const CORTEX_ENTITY_TYPES = ['service', 'alert', 'postmortem', 'runbook'];

/** One reinforcement turn of a tree: what one finished investigation marked as its path. */
export interface DecisionTreeTurn {
  version: number;
  at: string;
  /** True when the turn confirmed a root cause. */
  reinforced: boolean;
  tree: DecisionTreeView;
}

/** A decision tree with every turn investigations committed to it. */
export interface InvestigationTree {
  tree_id: string;
  symptom: string;
  status: string;
  turns: DecisionTreeTurn[];
}

/** A page an investigation wrote, shown next to a case as context. */
export interface InvestigationPage {
  kind: 'semantic_memory' | 'cortex';
  title: string;
  text: string;
}

/** Read-only access to what investigations learned in one space. */
export interface IInvestigationKnowledge {
  /** Every tree with its turns, oldest turn first. Empty when trees are not enabled. */
  decisionTrees(): Promise<InvestigationTree[]>;
  /** Semantic Memory and Cortex pages that mention one of the services. */
  pagesFor(services: string[]): Promise<InvestigationPage[]>;
  /** How many pages exist, for the learning summary. */
  countPages(): Promise<number>;
}

interface TreeSource {
  '@timestamp'?: string;
  type?: string;
  content?: string;
  evidence_gatherer_metadata?: string[];
  attributes?: Record<string, unknown>;
}

interface PageSource {
  title?: string;
  description?: string;
  content?: string;
  attributes?: Record<string, unknown>;
}

const toNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value ?? 0));
// The AI index maps `attributes` as flattened, so booleans come back as strings.
const toBoolean = (value: unknown) => value === true || value === 'true';

function trim(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_PAGE_TEXT ? `${flat.slice(0, MAX_PAGE_TEXT)}...` : flat;
}

function parseTurn(source: TreeSource, treeId: string): DecisionTreeTurn | undefined {
  try {
    const mermaid = extractMermaid(source.content ?? '');
    return {
      version: toNumber(source.attributes?.version),
      at: source['@timestamp'] ?? '',
      reinforced: toBoolean(source.attributes?.reinforced),
      tree: parseStoredDecisionTree(mermaid, treeId, source.evidence_gatherer_metadata ?? []),
    };
  } catch (error) {
    // A tree whose Mermaid no longer parses teaches nothing; the others still count.
    return undefined;
  }
}

export function createInvestigationKnowledge({
  esClient,
  spaceId,
  logger,
}: {
  /**
   * The user, as Nightshift Investigations reads them: the Kibana system user has no access to
   * `ai-index-idx-*`. Every read still filters by space, because the documents carry no
   * per-space permissions of their own.
   */
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
}): IInvestigationKnowledge {
  const spaceFilter = { term: { 'attributes.space_id': spaceId } };

  return {
    async decisionTrees() {
      try {
        const response = await esClient.search<TreeSource>({
          index: DECISION_TREE_INDEX,
          ignore_unavailable: true,
          allow_no_indices: true,
          size: MAX_VERSIONS,
          query: {
            bool: {
              filter: [
                spaceFilter,
                { terms: { type: ['decision_tree', 'decision_tree_version'] } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'asc', unmapped_type: 'date' } }],
        });
        const sources = response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
        const heads = sources
          .filter((source) => source.type === 'decision_tree')
          .slice(0, MAX_TREES);
        return heads.map((head): InvestigationTree => {
          const treeId = String(head.attributes?.tree_id ?? '');
          const turns = sources
            .filter(
              (source) =>
                source.type === 'decision_tree_version' &&
                String(source.attributes?.tree_id ?? '') === treeId
            )
            .flatMap((source) => {
              const turn = parseTurn(source, treeId);
              return turn ? [turn] : [];
            })
            .sort((a, b) => a.version - b.version);
          return {
            tree_id: treeId,
            symptom: String(head.attributes?.symptom ?? treeId),
            status: String(head.attributes?.status ?? 'tentative'),
            turns,
          };
        });
      } catch (error) {
        logger.debug(`Could not read decision trees: ${getErrorMessage(error)}`);
        return [];
      }
    },

    async pagesFor(services) {
      if (services.length === 0) {
        return [];
      }
      const mentions = {
        bool: {
          should: services.flatMap((service) => [
            { term: { tags: service } },
            { match_phrase: { title: service } },
            { match_phrase: { content: service } },
          ]),
          minimum_should_match: 1,
        },
      };
      const search = async (index: string, extra: object[], kind: InvestigationPage['kind']) => {
        try {
          const response = await esClient.search<PageSource>({
            index,
            ignore_unavailable: true,
            allow_no_indices: true,
            size: MAX_PAGES_PER_CASE,
            query: { bool: { filter: [spaceFilter, ...extra], must: [mentions] } },
          });
          return response.hits.hits.flatMap((hit): InvestigationPage[] =>
            hit._source
              ? [
                  {
                    kind,
                    title: hit._source.title ?? '',
                    text: trim(hit._source.content ?? hit._source.description ?? ''),
                  },
                ]
              : []
          );
        } catch (error) {
          logger.debug(`Could not read ${kind} pages: ${getErrorMessage(error)}`);
          return [];
        }
      };
      const [memory, cortex] = await Promise.all([
        search(
          SEMANTIC_MEMORY_INDEX,
          // Archived pages were merged away or judged harmful by investigations themselves.
          [{ bool: { must_not: [{ exists: { field: 'attributes.archive_reason' } }] } }],
          'semantic_memory'
        ),
        search(CORTEX_INDEX, [{ terms: { type: CORTEX_ENTITY_TYPES } }], 'cortex'),
      ]);
      return [...memory, ...cortex].slice(0, MAX_PAGES_PER_CASE);
    },

    async countPages() {
      try {
        const response = await esClient.count({
          index: [SEMANTIC_MEMORY_INDEX, CORTEX_INDEX],
          ignore_unavailable: true,
          allow_no_indices: true,
          query: spaceFilter,
        });
        return response.count;
      } catch (error) {
        return 0;
      }
    },
  };
}
