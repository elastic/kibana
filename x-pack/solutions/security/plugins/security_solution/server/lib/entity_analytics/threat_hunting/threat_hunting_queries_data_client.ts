/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import _ from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  ThreatHuntingQuery,
  ThreatHuntingQueryIndexStatus,
  ThreatHuntingQueryQuery,
  ThreatHuntingQueryWithIndexCheck,
} from '../../../../common/api/entity_analytics/threat_hunting/common.gen';
import type { ThreatHuntingListResponse } from '../../../../common/api/entity_analytics/threat_hunting/list.gen';
import type {
  ThreatHuntingQueryESQLResult,
  ThreatHuntingQueryEsDoc,
} from '../../../../common/entity_analytics/threat_hunting/types';

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

  /**
   * Initializes the cache index in Elasticsearch to store query status information
   * @returns Promise resolving to true if index was created or already existed
   */
  private async initialiseCacheIndex(): Promise<boolean> {
    const cacheIndexName = this.getCacheIndexName();
    try {
      // Check if index already exists
      const indexExists = await this.options.esClient.indices.exists({
        index: cacheIndexName,
      });

      if (indexExists) {
        this.options.logger.debug(`Cache index ${cacheIndexName} already exists`);
        return true;
      }

      // Create index with appropriate mappings
      await this.options.esClient.indices.create({
        index: cacheIndexName,
        mappings: {
          properties: {
            uuid: { type: 'keyword' },
            index_status: { type: 'keyword' },
            index_status_numeric_sort: { type: 'integer' },
          },
        },
        settings: {
          'index.mode': 'lookup',
        },
      });

      this.options.logger.debug(`Cache index ${cacheIndexName} created successfully`);

      return true;
    } catch (error) {
      this.options.logger.error(`Failed to initialise cache index: ${error}`);
      return false;
    }
  }

  private indexStatusToNumericSort(indexStatus: ThreatHuntingQueryIndexStatus): number {
    switch (indexStatus) {
      case 'all':
        return 1;
      case 'some':
        return 2;
      case 'none':
        return 3;
      case 'unknown':
        return 4;
      default:
        return 5; // Fallback for any unexpected status
    }
  }

  private async batchUpdateCacheIndex(
    records: Array<{ uuid: string; indexStatus: ThreatHuntingQueryIndexStatus }>
  ): Promise<void> {
    const cacheIndexName = this.getCacheIndexName();
    const bulkBody: string[] = [];

    records.forEach(({ uuid, indexStatus }) => {
      bulkBody.push(
        JSON.stringify({ update: { _index: cacheIndexName, _id: uuid } }),
        JSON.stringify({
          doc: {
            uuid,
            index_status: indexStatus,
            index_status_numeric_sort: this.indexStatusToNumericSort(indexStatus),
          },
          doc_as_upsert: true,
        })
      );
    });

    await this.options.esClient.bulk({
      body: bulkBody,
      refresh: 'wait_for',
    });
  }

  private lastQueryStatusCacheUpdate: number = 0;

  private isCacheUpdateInProgress = false;

  private async searchByQueryDsl({
    query,
    size = DEFAULT_RESPONSE_SIZE,
    sortField = '@timestamp',
    sortOrder = 'desc',
  }: {
    query?: QueryDslQueryContainer;
    size?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ThreatHuntingListResponse> {
    const { hits } = await this.options.esClient.search<ThreatHuntingQueryEsDoc>({
      index: this.getIndex(),
      size,
      sort: [{ [sortField]: { order: sortOrder } }],
      query,
    });

    return {
      queries: hits.hits.map((hit) =>
        this.esResultToThreatHuntingQuery(hit._source as ThreatHuntingQueryEsDoc)
      ),
    };
  }

  public async getByUuid({
    uuid,
  }: {
    uuid: string;
  }): Promise<ThreatHuntingQueryWithIndexCheck | null> {
    const { hits } = await this.options.esClient.search<ThreatHuntingQueryEsDoc>({
      index: this.getIndex(),
      size: 1,
      query: {
        term: {
          uuid,
        },
      },
    });

    if (hits.hits.length === 0) {
      return null;
    }

    const query = this.esResultToThreatHuntingQuery(
      hits.hits[0]._source as ThreatHuntingQueryEsDoc
    );

    const indexStatus = await this.options.esClient.search<{
      index_status: ThreatHuntingQueryIndexStatus;
    }>({
      index: this.getCacheIndexName(),
      size: 1,
      query: {
        term: {
          uuid,
        },
      },
    });

    const indexStatusDoc = indexStatus.hits?.hits?.[0]?._source;

    const indexStatusValue = indexStatusDoc?.index_status || 'unknown';

    return {
      ...query,
      indexStatus: indexStatusValue,
    } as ThreatHuntingQueryWithIndexCheck;
  }

  public async searchByKuery({
    searchText = '',
    kuery,
    size = DEFAULT_RESPONSE_SIZE,
    includeIndexStatuses,
    includeCategories,
    sortField = 'index_status',
    sortOrder = 'asc',
  }: {
    searchText?: string;
    includeCategories?: string[];
    includeIndexStatuses?: ThreatHuntingQueryIndexStatus[];
    kuery?: string;
    size?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ThreatHuntingListResponse> {
    await this.maybeUpdateQueryStatusCache();

    let sortFieldModified = sortField;

    if (sortField === 'index_status') {
      sortFieldModified = 'index_status_numeric_sort';
    }

    const whereClauses: string[] = [];

    if (searchText) {
      whereClauses.push(`MATCH(name, "${searchText}",{"fuzziness": 2})`);
    }

    if (includeCategories && includeCategories.length > 0) {
      whereClauses.push(`category IN ("${includeCategories.join('", "')}")`);
    }

    if (includeIndexStatuses && includeIndexStatuses.length > 0) {
      whereClauses.push(`index_status IN ("${includeIndexStatuses.join('", "')}")`);
    }

    if (kuery) {
      whereClauses.push(`KQL("${kuery}")`);
    }

    const whereStatement = whereClauses.length > 0 ? `| WHERE ${whereClauses.join(' AND ')}` : '';

    const esql = whereStatement
      ? `
    FROM "${this.getIndex()}"
      | LOOKUP JOIN ${this.getCacheIndexName()} ON uuid
      ${whereStatement}
      | SORT ${sortFieldModified} ${sortOrder}
      | LIMIT ${size ?? DEFAULT_RESPONSE_SIZE}
    `
      : `
    FROM "${this.getIndex()}"
      | LOOKUP JOIN ${this.getCacheIndexName()} ON uuid
      | SORT ${sortFieldModified} ${sortOrder}
      | LIMIT ${size ?? DEFAULT_RESPONSE_SIZE}
    `;

    try {
      const { records: queries } = await this.options.esClient.helpers
        .esql({ query: esql })
        .toRecords<ThreatHuntingQueryESQLResult>();

      return {
        queries: queries.map((q) => this.esqlRecordToThreatHuntingQuery(q)),
      };
    } catch (error) {
      this.options.logger.error(`Error executing ESQL query: ${error}`);
      throw new Error(`Failed to execute ESQL query: ${error}`);
    }
  }

  public getIndex() {
    return 'threat-hunting-queries';
  }

  public getCacheIndexName() {
    return `${this.getIndex()}-query-status-cache`;
  }

  public getEnrichPolicyName() {
    return `${this.getCacheIndexName()}-policy`;
  }

  private async maybeUpdateQueryStatusCache() {
    if (Date.now() - this.lastQueryStatusCacheUpdate > INDEX_STATUS_CHECK_CACHE_STALE_AFTER_MS) {
      await this.updateQueryStatusCache();
    }
  }

  private async checkIndexExists(indices: string[] | string): Promise<boolean> {
    try {
      const index = Array.isArray(indices) ? indices.join(',') : indices;
      const result = await this.options.esClient.indices.exists({ index, allow_no_indices: false });
      return result;
    } catch (error) {
      this.options.logger.error(`Error checking index existence: ${error}`);
      throw new Error(`Failed to check index existence: ${error}`);
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
  private async updateQueryStatusCache() {
    if (this.isCacheUpdateInProgress) {
      return;
    }

    await this.initialiseCacheIndex();

    this.isCacheUpdateInProgress = true;

    const { queries = [] } = await this.searchByQueryDsl({
      size: MAX_RESPONSE_SIZE,
    });

    const indicesByQueryUuid = new Map<string, string[]>();
    const allIndices = new Set<string>();

    for (const query of queries) {
      const { uuid, queries: queryQueries } = query;
      const indices = queryQueries.map((q) => q.indices).flat();
      indicesByQueryUuid.set(uuid, indices);
      indices.forEach((index) => allIndices.add(index));
    }

    const indexBatches: string[][] = _.chunk([...allIndices], INDEX_CHECK_BATCH_SIZE);
    const indexExistenceResults: Array<{
      index: string;
      exists: boolean;
    }> = [];

    for (const batch of indexBatches) {
      try {
        const batchExists = await this.checkIndexExists(batch);

        if (batchExists) {
          batch.forEach((index) => {
            indexExistenceResults.push({ index, exists: true });
          });
        } else {
          // this means at least one index in the batch does not exist
          // so now we need to check each index individually
          const individualResults = await Promise.all(
            batch.map(async (index) => {
              const exists = await this.checkIndexExists(index);
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

    const updateRecords: Array<{ uuid: string; indexStatus: ThreatHuntingQueryIndexStatus }> = [];
    for (const [uuid, indices] of indicesByQueryUuid.entries()) {
      let indexStatus: ThreatHuntingQueryIndexStatus = 'unknown';

      if (indices.every((index) => indexExistsMap.get(index))) {
        indexStatus = 'all';
      } else {
        const someIndicesExist = indices.some((index) => indexExistsMap.get(index));
        indexStatus = someIndicesExist ? 'some' : 'none';
      }

      updateRecords.push({ uuid, indexStatus });
    }

    await this.batchUpdateCacheIndex(updateRecords);

    this.lastQueryStatusCacheUpdate = Date.now();
    this.isCacheUpdateInProgress = false;
  }

  private esResultToThreatHuntingQuery(doc: ThreatHuntingQueryEsDoc): ThreatHuntingQuery {
    const queries: ThreatHuntingQueryQuery[] = doc.queries.map((q) => ({
      query: q.query,
      indices: q.indices,
      cleanedQuery: q.cleaned_query,
    }));

    return {
      ...doc,
      queries,
    };
  }

  private esqlRecordToThreatHuntingQuery(
    record: ThreatHuntingQueryESQLResult
  ): ThreatHuntingQueryWithIndexCheck {
    const queries: ThreatHuntingQueryQuery[] = [];

    const queryQueries = Array.isArray(record['queries.query'])
      ? record['queries.query']
      : [record['queries.query']];

    const queryIndices = Array.isArray(record['queries.indices'])
      ? record['queries.indices']
      : [record['queries.indices']];

    const queryCleanedQueries = Array.isArray(record['queries.cleaned_query'])
      ? record['queries.cleaned_query']
      : [record['queries.cleaned_query']];

    for (let i = 0; i < queryQueries.length; i++) {
      queries.push({
        query: queryQueries[i],
        indices: [queryIndices?.[i]],
        cleanedQuery: queryCleanedQueries?.[i],
      });
    }

    return {
      ...record,
      queries,
      indexStatus: record.index_status,
    };
  }
}
