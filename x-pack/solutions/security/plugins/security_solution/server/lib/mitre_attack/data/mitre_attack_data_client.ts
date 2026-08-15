/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  MitreEntity,
  MitreEntityType,
  MitreFramework,
} from '@kbn/security-mitre-attack-common';
import { MITRE_SEMANTIC_FIELD } from '@kbn/security-mitre-attack-common';

const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 1500;

/** Reciprocal-rank-fusion constant. 60 is the value RRF was published with. */
const RRF_RANK_CONSTANT = 60;

/**
 * How deep each arm of the hybrid retriever ranks before fusion. Kept a few
 * multiples above the usual page size so a result that only one arm likes can
 * still surface after fusion.
 */
const RRF_RANK_WINDOW_MULTIPLIER = 4;
const MIN_RRF_RANK_WINDOW = 50;

export type MitreSearchMode = 'keyword' | 'semantic' | 'hybrid' | 'auto';

/** The concrete strategy a search ran with, after `auto` is resolved. */
export type ResolvedMitreSearchMode = Exclude<MitreSearchMode, 'auto'>;

interface MitreAttackDataClientDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  /**
   * Provides the space-scoped index name and whether that index carries
   * embeddings. Awaits hydration if necessary, so semantic availability is
   * accurate by the time it resolves.
   */
  resolveTarget: () => Promise<{ indexName: string; semanticEnabled: boolean }>;
}

export interface MitreAttackSearchParams {
  query: string;
  framework?: MitreFramework;
  types?: MitreEntityType[];
  limit?: number;
  /**
   * Retrieval strategy. Defaults to `auto`, which uses `hybrid` when the index
   * has embeddings and falls back to `keyword` when it does not.
   */
  mode?: MitreSearchMode;
}

export interface MitreAttackSearchResult {
  entities: MitreEntity[];
  /** Strategy actually used, so callers and evals can tell arms apart. */
  mode: ResolvedMitreSearchMode;
}

export interface MitreAttackListParams {
  framework?: MitreFramework;
  types?: MitreEntityType[];
  /** Filter techniques / subtechniques by tactic shortname (e.g. `credential-access`). */
  tactic?: string;
  /** Filter subtechniques to a single parent technique id (e.g. `T1078`). */
  techniqueId?: string;
}

/**
 * Read-only client for the managed MITRE ATT&CK index. Created per-request and
 * scoped to the request's space.
 */
export class MitreAttackDataClient {
  constructor(private readonly deps: MitreAttackDataClientDeps) {}

  async getById(framework: MitreFramework, id: string): Promise<MitreEntity | undefined> {
    const { indexName } = await this.deps.resolveTarget();
    const docId = this.buildDocId(framework, id);
    try {
      const response = await this.deps.esClient.get<MitreEntity>({
        index: indexName,
        id: docId,
      });
      return response._source ?? undefined;
    } catch (err) {
      if (err?.meta?.statusCode === 404) return undefined;
      throw err;
    }
  }

  async list(params: MitreAttackListParams = {}): Promise<MitreEntity[]> {
    const { indexName } = await this.deps.resolveTarget();
    const filters = this.buildFilters(params);
    const response = await this.deps.esClient.search<MitreEntity>({
      index: indexName,
      size: DEFAULT_PAGE_SIZE,
      track_total_hits: false,
      sort: [{ name: 'asc' }],
      query: { bool: { filter: filters } },
    });
    return this.extractSources(response);
  }

  async search({
    query,
    framework,
    types,
    limit,
    mode = 'auto',
  }: MitreAttackSearchParams): Promise<MitreAttackSearchResult> {
    const { indexName, semanticEnabled } = await this.deps.resolveTarget();
    const filters = this.buildFilters({ framework, types });
    const size = Math.min(MAX_PAGE_SIZE, Math.max(1, limit ?? 25));
    const resolvedMode = this.resolveMode(mode, semanticEnabled);

    if (resolvedMode === 'keyword') {
      const response = await this.deps.esClient.search<MitreEntity>({
        index: indexName,
        size,
        track_total_hits: false,
        query: {
          bool: {
            filter: filters,
            must: [this.buildKeywordQuery(query)],
          },
        },
      });
      return { entities: this.extractSources(response), mode: resolvedMode };
    }

    const response = await this.deps.esClient.search<MitreEntity>({
      index: indexName,
      size,
      track_total_hits: false,
      retriever: this.buildRetriever(resolvedMode, query, filters, size),
    });
    return { entities: this.extractSources(response), mode: resolvedMode };
  }

  /**
   * `auto` prefers hybrid but degrades to keyword rather than returning nothing
   * when the index was hydrated without embeddings. An explicit `semantic` or
   * `hybrid` request degrades the same way, because the alternative is querying
   * a field that is not in the mapping.
   */
  private resolveMode(mode: MitreSearchMode, semanticEnabled: boolean): ResolvedMitreSearchMode {
    if (!semanticEnabled) {
      if (mode === 'semantic' || mode === 'hybrid') {
        this.deps.logger.debug(
          `MITRE ATT&CK search requested mode "${mode}" but the index has no embeddings; falling back to keyword`
        );
      }
      return 'keyword';
    }
    return mode === 'auto' ? 'hybrid' : mode;
  }

  private buildKeywordQuery(query: string) {
    return {
      multi_match: {
        query,
        fields: ['name.text^3', 'description', 'id^2'],
        operator: 'or' as const,
      },
    };
  }

  private buildSemanticQuery(query: string) {
    return { semantic: { field: MITRE_SEMANTIC_FIELD, query } };
  }

  private buildRetriever(
    mode: Exclude<ResolvedMitreSearchMode, 'keyword'>,
    query: string,
    filters: object[],
    size: number
  ) {
    if (mode === 'semantic') {
      return {
        standard: {
          query: {
            bool: {
              filter: filters,
              must: [this.buildSemanticQuery(query)],
            },
          },
        },
      };
    }

    return {
      rrf: {
        retrievers: [
          { standard: { query: this.buildKeywordQuery(query) } },
          { standard: { query: this.buildSemanticQuery(query) } },
        ],
        // Applied once to the fused result rather than per-arm, so both arms
        // rank over the same candidate set.
        filter: filters,
        rank_window_size: Math.max(MIN_RRF_RANK_WINDOW, size * RRF_RANK_WINDOW_MULTIPLIER),
        rank_constant: RRF_RANK_CONSTANT,
      },
    };
  }

  private buildDocId(framework: MitreFramework, id: string): string {
    return `${framework}:${id}`;
  }

  private buildFilters({ framework, types, tactic, techniqueId }: MitreAttackListParams) {
    const filters: object[] = [];
    if (framework) filters.push({ term: { framework } });
    if (types && types.length > 0) filters.push({ terms: { type: types } });
    if (tactic) filters.push({ term: { tactics: tactic } });
    if (techniqueId) filters.push({ term: { techniqueId } });
    return filters;
  }

  private extractSources(
    response: Awaited<ReturnType<ElasticsearchClient['search']>>
  ): MitreEntity[] {
    const hits = response.hits?.hits ?? [];
    return hits
      .map((hit) => hit._source as MitreEntity | undefined)
      .filter((source): source is MitreEntity => source != null);
  }
}
