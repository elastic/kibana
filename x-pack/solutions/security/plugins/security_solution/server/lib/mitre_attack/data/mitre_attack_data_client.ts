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

const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 1500;

interface MitreAttackDataClientDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Provides the space-scoped index name. Awaits hydration if necessary. */
  resolveIndexName: () => Promise<string>;
}

export interface MitreAttackSearchParams {
  query: string;
  framework?: MitreFramework;
  types?: MitreEntityType[];
  limit?: number;
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
    const indexName = await this.deps.resolveIndexName();
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
    const indexName = await this.deps.resolveIndexName();
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
  }: MitreAttackSearchParams): Promise<MitreEntity[]> {
    const indexName = await this.deps.resolveIndexName();
    const filters = this.buildFilters({ framework, types });
    const size = Math.min(MAX_PAGE_SIZE, Math.max(1, limit ?? 25));

    const response = await this.deps.esClient.search<MitreEntity>({
      index: indexName,
      size,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
          must: [
            {
              multi_match: {
                query,
                fields: ['name.text^3', 'description', 'id^2'],
                operator: 'or',
              },
            },
          ],
        },
      },
    });
    return this.extractSources(response);
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
