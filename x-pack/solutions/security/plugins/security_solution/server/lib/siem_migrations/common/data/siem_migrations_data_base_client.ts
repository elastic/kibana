/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchHit,
  SearchRequest,
  SearchResponse,
  Duration,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  AuthenticatedUser,
  ElasticsearchClient,
  IScopedClusterClient,
  Logger,
} from '@kbn/core/server';
import assert from 'assert';
import type { SiemMigrationsClientDependencies, SiemMigrationsIndexNameProvider } from '../types';
import type { Stored } from '../../types';

const DEFAULT_PIT_KEEP_ALIVE: Duration = '30s' as const;

export class SiemMigrationsDataBaseClient {
  protected esClient: ElasticsearchClient;

  constructor(
    protected getIndexName: SiemMigrationsIndexNameProvider,
    protected currentUser: AuthenticatedUser,
    protected esScopedClient: IScopedClusterClient,
    protected logger: Logger,
    protected dependencies: SiemMigrationsClientDependencies
  ) {
    this.esClient = esScopedClient.asInternalUser;
  }

  protected async getProfileUid() {
    if (this.currentUser.profile_uid) {
      return this.currentUser.profile_uid;
    }
    const username = this.currentUser.username;
    try {
      const users = await this.esScopedClient.asCurrentUser.security.getUser({
        username,
        with_profile_uid: true,
      });
      return users[username].profile_uid;
    } catch (error) {
      this.logger.error(`Error getting profile_uid for user ${username}: ${error}`);
      return username;
    }
  }

  protected processHit<T extends object>(hit: SearchHit<T>, override: Partial<T> = {}): Stored<T> {
    const { _id, _source } = hit;
    assert(_id, 'document should have _id');
    assert(_source, 'document should have _source');
    return { ..._source, ...override, id: _id };
  }

  protected processHits<T extends object>(
    hits: Array<SearchHit<T>> = [],
    override: Partial<T> = {}
  ): Array<Stored<T>> {
    return hits.map((hit) => this.processHit(hit, override));
  }

  protected processResponseHits<T extends object>(
    response: SearchResponse<T>,
    override?: Partial<T>
  ): Array<Stored<T>> {
    return this.processHits(response.hits.hits, override);
  }

  protected getTotalHits(response: SearchResponse) {
    return typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;
  }

  /** Returns functions to iterate over all the search results in batches */
  protected getSearchBatches<T extends object>(
    search: SearchRequest,
    keepAlive: Duration = DEFAULT_PIT_KEEP_ALIVE
  ) {
    const pitPromise = this.getIndexName().then((index) =>
      this.esClient.openPointInTime({ index, keep_alive: keepAlive }).then(({ id }) => id)
    );

    let pitId: string;

    let currentBatchSearch: Promise<SearchResponse<T>> | undefined;
    /* Returns the next batch of search results */
    const next = async (): Promise<Array<Stored<T>>> => {
      if (!pitId) {
        // eslint-disable-next-line require-atomic-updates
        pitId = await pitPromise;
      }
      if (!currentBatchSearch) {
        currentBatchSearch = this.esClient.search<T>({
          ...search,
          pit: { id: pitId, keep_alive: keepAlive },
        });
      } else {
        currentBatchSearch = currentBatchSearch.then((previousResponse) => {
          if (previousResponse.pit_id) {
            pitId = previousResponse.pit_id;
          }
          if (previousResponse.hits.hits.length === 0) {
            return previousResponse;
          }
          const lastSort = previousResponse.hits.hits[previousResponse.hits.hits.length - 1].sort;
          return this.esClient.search<T>({
            ...search,
            pit: { id: pitId, keep_alive: keepAlive },
            search_after: lastSort,
          });
        });
      }
      const response = await currentBatchSearch;
      if (response.pit_id) {
        // eslint-disable-next-line require-atomic-updates
        pitId = response.pit_id;
      }
      return this.processResponseHits(response);
    };

    /** Returns all the search results */
    const all = async (): Promise<Array<Stored<T>>> => {
      const allResults: Array<Stored<T>> = [];
      let results = await next();
      while (results.length) {
        allResults.push(...results);
        results = await next();
      }
      return allResults;
    };

    return { next, all };
  }
}
