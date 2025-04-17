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
import type {
  ThreatHuntingQuery,
  ThreatHuntingQueryQuery,
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

export class ThreatHuntingQueriesDataClient {
  constructor(private readonly options: ThreatHuntingQueriesClientOpts) {}

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
    queries: ThreatHuntingQuery[];
    total: number;
  } {
    const queries = response.hits.hits.map((hit) =>
      ThreatHuntingQueriesDataClient.esResultToThreatHuntingQuery(
        hit._source as ThreatHuntingQueryEsDoc
      )
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

  static esResultToThreatHuntingQuery(doc: ThreatHuntingQueryEsDoc): ThreatHuntingQuery {
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
}
