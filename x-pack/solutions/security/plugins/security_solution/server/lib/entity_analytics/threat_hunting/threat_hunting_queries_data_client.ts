/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '@kbn/es-types';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import _ from 'lodash';
import type {
  ThreatHuntingQuery,
  ThreatHuntingQueryQuery,
  ThreatHuntingQueryWithIndexCheck,
} from '../../../../common/api/entity_analytics/threat_hunting/common.gen';
import type { ThreatHuntingListResponse } from '../../../../common/api/entity_analytics/threat_hunting/list.gen';
import type { ThreatHuntingQueryEsDoc } from '../../../../common/entity_analytics/threat_hunting/types';

interface ThreatHuntingQueriesClientOpts {
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  esClient: ElasticsearchClient;
  namespace: string;
}

const DEFAULT_RESPONSE_SIZE = 1000;
const MAX_RESPONSE_SIZE = 10000;
const INDEX_CHECK_BATCH_SIZE = 10;
const INDEX_STATUS_CHECK_CACHE_STALE_AFTER_MS = 1000 * 60 * 5; // 5 minutes

export class ThreatHuntingQueriesDataClient {
  constructor(private readonly options: ThreatHuntingQueriesClientOpts) {}

  // uuid is used to identify the query
  // true if there is data in the query indices
  private queryDataStatusCache: Map<string, boolean> = new Map();

  private lastQueryStatusCacheUpdate: number = 0;

  private isCacheUpdateInProgress = false;
  /**
   *
   * A general method for searching asset criticality records.
   * @param query an ESL query to filter criticality results
   * @param size the maximum number of records to return. Cannot exceed {@link MAX_CRITICALITY_RESPONSE_SIZE}. If unspecified, will default to {@link DEFAULT_CRITICALITY_RESPONSE_SIZE}.
   * @returns criticality records matching the query
   */
  public async search({
    query,
    size = DEFAULT_RESPONSE_SIZE,
    from,
    sort = ['@timestamp'], // without a default sort order the results are not deterministic which makes testing hard
  }: {
    query: ESFilter;
    size?: number;
    from?: number;
    sort?: SearchRequest['sort'];
  }): Promise<ThreatHuntingListResponse> {
    // Check if the query status cache needs to be updated
    await this.maybeUpdateQueryStatusCache();

    try {
      const response = await this.options.esClient.search<ThreatHuntingQueryEsDoc>({
        index: this.getIndex(),
        ignore_unavailable: true,
        query,
        size: Math.min(size, MAX_RESPONSE_SIZE),
        from,
        sort,
      });

      return this.formatSearchResponse(response);
    } catch (error) {
      this.options.logger.error(`Error searching threat hunting queries: ${error}`);
      throw error;
    }
  }

  public async searchByKuery({
    kuery,
    size,
    from,
    sort,
  }: {
    kuery?: string;
    size?: number;
    from?: number;
    sort?: SearchRequest['sort'];
  }) {
    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };

    return this.search({
      query,
      size,
      from,
      sort,
    });
  }

  public getIndex() {
    return 'threat-hunting-queries';
  }

  public formatSearchResponse(response: SearchResponse<ThreatHuntingQueryEsDoc>): {
    queries: ThreatHuntingQueryWithIndexCheck[];
    total: number;
  } {
    const queries = response.hits.hits.map((hit) =>
      this.esResultToThreatHuntingQuery(hit._source as ThreatHuntingQueryEsDoc)
    );
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return {
      queries,
      total,
    };
  }

  private async maybeUpdateQueryStatusCache() {
    // we only update the cache if it is empty or if the cache is stale
    if (
      this.queryDataStatusCache.size === 0 ||
      Date.now() - this.lastQueryStatusCacheUpdate > INDEX_STATUS_CHECK_CACHE_STALE_AFTER_MS
    ) {
      await this.updateQueryStatusCache();
    }
  }

  /**
   * Updates the query status cache by checking the existence of indices associated with all queries.
   * This function:
   * 1. Retrieves all threat hunting queries
   * 2. Collects all unique indices across these queries
   * 3. Checks if these indices exist in Elasticsearch (in batches for efficiency)
   * 4. Updates the queryDataStatusCache Map with each query's data availability status
   * @returns {Promise<void>}
   */
  private async updateQueryStatusCache(onlyQueries?: ThreatHuntingQuery[]) {
    if (this.isCacheUpdateInProgress && !onlyQueries) {
      return;
    }

    if (!onlyQueries) {
      this.isCacheUpdateInProgress = true;
    }

    let queriesToCheck: ThreatHuntingQuery[];

    if (onlyQueries) {
      queriesToCheck = onlyQueries;
    } else {
      const { queries = [] } = await this.search({
        query: { match_all: {} },
        size: MAX_RESPONSE_SIZE,
      });
      queriesToCheck = queries;
    }

    const indicesByQueryUuid = new Map<string, string[]>();
    const allIndices = new Set<string>();

    for (const query of queriesToCheck) {
      const { uuid, queries: queryQueries } = query;
      const indices = queryQueries.map((q) => q.indices).flat();
      indicesByQueryUuid.set(uuid, indices);
      indices.forEach((index) => allIndices.add(index));
    }

    const indexBatches: string[][] = _.chunk([...allIndices], INDEX_CHECK_BATCH_SIZE);
    const indexExistenceResults: Array<{ index: string; exists: boolean }> = [];

    for (const batch of indexBatches) {
      try {
        const batchIndex = batch.join(',');
        const batchExists = await this.options.esClient.indices.exists({ index: batchIndex });

        if (batchExists) {
          batch.forEach((index) => {
            indexExistenceResults.push({ index, exists: true });
          });
        } else {
          // this means at least one index in the batch does not exist
          // so now we need to check each index individually
          const individualResults = await Promise.all(
            batch.map(async (index) => {
              const exists = await this.options.esClient.indices.exists({ index });
              return { index, exists };
            })
          );
          indexExistenceResults.push(...individualResults);
        }
      } catch (error) {
        throw new Error(`Error checking index existence: ${error}`);
      }
    }

    const indexExistsMap = new Map(
      indexExistenceResults.map(({ index, exists }) => [index, exists])
    );

    for (const [uuid, indices] of indicesByQueryUuid.entries()) {
      const hasExistingIndices = indices.some((index) => indexExistsMap.get(index));
      this.queryDataStatusCache.set(uuid, hasExistingIndices);
    }

    if (onlyQueries) {
      return;
    }
    this.lastQueryStatusCacheUpdate = Date.now();
    this.isCacheUpdateInProgress = false;
  }

  private esResultToThreatHuntingQuery(
    doc: ThreatHuntingQueryEsDoc
  ): ThreatHuntingQueryWithIndexCheck {
    const queries: ThreatHuntingQueryQuery[] = doc.queries.map((q) => ({
      query: q.query,
      indices: q.indices,
      cleanedQuery: q.cleaned_query,
    }));

    return {
      ...doc,
      queries,
      indicesExist: this.queryDataStatusCache.get(doc.uuid) ?? false,
    };
  }
}
