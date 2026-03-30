/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mergeMap,
  finalize,
  expand,
  filter,
  EMPTY,
  from,
  merge,
  throwError,
  type Observable,
  takeUntil,
  map,
  timer,
} from 'rxjs';
import * as rx from 'rxjs';
import type { ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import type {
  EqlSearchRequest,
  Indices,
  SearchRequest,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { QueryConfig, CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import {
  ValidationError,
  type CircuitBreaker,
  type CircuitBreakerResult,
} from './health_diagnostic_circuit_breakers.types';
import {
  QueryType,
  PermissionError,
  type IntegrationResolution,
  type ExecutableQuery,
} from './health_diagnostic_service.types';
import type { TelemetryLogger } from '../telemetry_logger';
import { newTelemetryLogger, withErrorMessage } from '../helpers';

export class CircuitBreakingQueryExecutorImpl implements CircuitBreakingQueryExecutor {
  private readonly logger: TelemetryLogger;
  constructor(
    private client: ElasticsearchClient,
    private readonly isServerless: boolean,
    logger: Logger
  ) {
    this.logger = newTelemetryLogger(logger.get('circuit-breaking-query-executor'));
  }

  search<T>({ query, circuitBreakers }: QueryConfig): Observable<T> {
    const controller = new AbortController();
    const abortSignal = controller.signal;
    const circuitBreakers$ = this.configureCircuitBreakers(circuitBreakers, controller);

    switch (query.query.type) {
      case QueryType.DSL:
        return this.streamDSL<T>(query, abortSignal).pipe(takeUntil(circuitBreakers$));
      case QueryType.EQL:
        return this.streamEql<T>(query, abortSignal).pipe(takeUntil(circuitBreakers$));
      case QueryType.ESQL:
        return this.streamEsql<T>(query, abortSignal).pipe(takeUntil(circuitBreakers$));
      default: {
        const exhaustiveCheck: never = query.query.type;
        throw new Error(`Unhandled QueryType: ${exhaustiveCheck}`);
      }
    }
  }

  streamEsql<T>(executableQuery: ExecutableQuery, abortSignal: AbortSignal): Observable<T> {
    const { query } = executableQuery;

    if (query.version === 2 && /^[\s\r\n]*FROM/i.test(query.query)) {
      // never should fail here since we already manage this scenario in the resolver, but just in case, we put this guard to
      // avoid running potentially unsafe queries
      return throwError(
        () =>
          new Error(
            'v2 ESQL descriptors must not contain a FROM clause; use the integrations field to target indices'
          )
      );
    }

    const regex = /^[\s\r\n]*FROM/i;
    const originalIndices = this.originalIndicesFor(executableQuery);

    return from(this.checkPermissions(originalIndices)).pipe(
      mergeMap(() => from(this.indicesFor(executableQuery))),
      mergeMap((indices) =>
        from(
          indices.map((index) => {
            const esqlQuery = regex.test(query.query)
              ? query.query
              : `FROM ${index} | ${query.query}`;
            return from(
              this.client.helpers.esql({ query: esqlQuery }, { signal: abortSignal }).toRecords()
            ).pipe(mergeMap((resp) => resp.records.map((r) => r as T)));
          })
        ).pipe(mergeMap((obs) => obs))
      )
    );
  }

  streamEql<T>(executableQuery: ExecutableQuery, abortSignal: AbortSignal): Observable<T> {
    const { query } = executableQuery;
    const originalIndices = this.originalIndicesFor(executableQuery);

    return from(this.checkPermissions(originalIndices)).pipe(
      mergeMap(() => from(this.indicesFor(executableQuery))),
      mergeMap((indices) => {
        const request: EqlSearchRequest = {
          index: indices,
          query: query.query,
          size: query.size,
        };

        return from(this.client.eql.search(request, { signal: abortSignal })).pipe(
          mergeMap((resp) => {
            if (resp.hits.events) {
              return resp.hits.events.map((h) => h._source as T);
            } else if (resp.hits.sequences) {
              return resp.hits.sequences.map((seq) => seq.events.map((h) => h._source) as T);
            } else {
              this.logger.warn('>> Neither hits.events nor hits.sequences found', {
                queryName: query.name,
              } as LogMeta);
              return [];
            }
          })
        );
      })
    );
  }

  private async checkPermissions(index: Indices) {
    try {
      const res = await this.client.security.hasPrivileges({
        index: [
          {
            names: index,
            privileges: ['read'],
          },
        ],
      });
      if (!res.has_all_requested) {
        throw new PermissionError('Missing read privileges');
      }
    } catch (e) {
      throw new PermissionError(`Error checking privileges: ${e}`);
    }
  }

  streamDSL<T>(
    executableQuery: ExecutableQuery,
    abortSignal: AbortSignal,
    pitKeepAlive: string = '1m'
  ): Observable<T> {
    const { query } = executableQuery;
    const pageSize = query.size ?? 10000;
    const parsedQuery: SearchRequest = JSON.parse(query.query) as SearchRequest;
    const originalIndices = this.originalIndicesFor(executableQuery);

    let pitId: string;
    let searchAfter: SortResults | undefined;

    const fetchPage = () => {
      const paginatedRequest: SearchRequest = {
        size: pageSize,
        sort: [{ _shard_doc: 'asc' }],
        search_after: searchAfter,
        pit: { id: pitId, keep_alive: pitKeepAlive },
        ...parsedQuery,
      };
      return this.client.search<T>(paginatedRequest, { signal: abortSignal });
    };

    return from(this.checkPermissions(originalIndices)).pipe(
      mergeMap(() => from(this.indicesFor(executableQuery))),
      mergeMap((indices) =>
        from(this.client.openPointInTime({ index: indices, keep_alive: pitKeepAlive }))
      ),
      map((res) => res.id),

      mergeMap((id) => {
        pitId = id;
        return from(fetchPage());
      }),
      expand((searchResponse) => {
        const returnedPitId = (searchResponse as { pit_id?: string }).pit_id;
        if (returnedPitId) {
          pitId = returnedPitId;
        }

        const hits = searchResponse.hits.hits;
        const aggrs = searchResponse.aggregations;

        if (aggrs || hits.length === 0) {
          return EMPTY;
        }

        searchAfter = hits[hits.length - 1].sort;
        return from(fetchPage());
      }),

      mergeMap((searchResponse) => {
        if (searchResponse.aggregations) {
          return [searchResponse.aggregations as T];
        } else {
          return searchResponse.hits.hits.map((h) => h._source as T);
        }
      }),

      finalize(() => {
        if (pitId !== undefined) {
          this.client.closePointInTime({ id: pitId }).catch((error) => {
            this.logger.warn('>> closePointInTime error', withErrorMessage(error));
          });
        }
      })
    );
  }

  configureCircuitBreakers(
    circuitBreakers: CircuitBreaker[],
    controller: AbortController
  ): Observable<CircuitBreakerResult> {
    return merge(
      ...circuitBreakers.map((cb) =>
        timer(0, cb.validationIntervalMs()).pipe(
          rx.mergeMap(() => rx.from(cb.validate())),
          filter((result) => !result.valid)
        )
      )
    ).pipe(
      map((result) => {
        this.logger.debug('>> Circuit breaker triggered', { circuitBreaker: result } as LogMeta);
        controller.abort();
        throw new ValidationError(result);
      })
    );
  }

  /**
   * Returns the list of indices to query based on the provided tiers.
   * Dispatches on query version: v1 uses `query.index`, v2 uses resolved indices from Fleet.
   * When running in serverless or the index is not managed by ILM, returns the base indices as-is.
   */
  async indicesFor(executableQuery: ExecutableQuery): Promise<string[]> {
    const { query } = executableQuery;
    const tiers = query.tiers;

    let baseIndices: string[];
    if (query.version === 1) {
      baseIndices = [query.index];
      this.logger.debug('Using index from v1 query', { queryName: query.name } as LogMeta);
    } else if ('index' in query && query.index) {
      baseIndices = [query.index as string];
      this.logger.trace('Using index from v2 query', { queryName: query.name } as LogMeta);
    } else {
      const v2Query = executableQuery as Extract<
        ExecutableQuery,
        { resolution: IntegrationResolution }
      >;
      baseIndices = v2Query.resolution.indices;
      this.logger.debug('Using resolved indices from v2 query', {
        queryName: query.name,
        count: baseIndices.length,
      } as LogMeta);
    }

    if (this.isServerless) {
      this.logger.debug('Running in serverless, returning index as is', {
        queryName: query.name,
      } as LogMeta);
      return baseIndices;
    }

    if (tiers === undefined || baseIndices.length === 0) {
      this.logger.debug('No tiers defined or no base indices, returning as-is', {
        queryName: query.name,
      } as LogMeta);
      return baseIndices;
    }

    const tiered = await Promise.all(baseIndices.map((index) => this.filterByTier(index, tiers)));
    return tiered.flat().filter((index) => index !== '');
  }

  private async filterByTier(index: string, tiers: string[]): Promise<string[]> {
    return this.client.ilm
      .explainLifecycle({
        index,
        only_managed: false,
        filter_path: ['indices.*.phase'],
      })
      .then((response) => {
        if (response.indices === undefined) {
          this.logger.debug(
            'Got an empty response while explaining lifecycle. Asumming serverless.',
            { index } as LogMeta
          );
          return [index];
        } else {
          const indices = Object.entries(response.indices).map(([indexName, stats]) => {
            if ('phase' in stats && stats.phase) {
              if (tiers.includes(stats.phase)) {
                return indexName;
              } else {
                this.logger.debug('Index is not in the expected phases', {
                  phase: stats.phase,
                  index: indexName,
                  tiers,
                } as LogMeta);
                return '';
              }
            } else {
              this.logger.debug('Index is not managed by an ILM', {
                index: indexName,
                tiers,
              } as LogMeta);
              return '';
            }
          });
          this.logger.debug('Indices managed by ILM', {
            index,
            tiers,
            indices,
          } as LogMeta);
          return indices;
        }
      })
      .then((indices) => {
        return indices.filter((indexName) => indexName !== '');
      })
      .catch((error) => {
        this.logger.info(
          'Error while checking ILM status, assuming serverless',
          withErrorMessage(error)
        );
        return [index];
      });
  }

  // Returns the "pre-ILM" index/datastream patterns used for permission checking only.
  // v1: the literal `index` field; v2: the Fleet-resolved datastream names.
  // Permissions are granted against these names, NOT the backing .ds-* indices.
  private originalIndicesFor(executableQuery: ExecutableQuery): string[] {
    if (executableQuery.query.version === 1) {
      return [executableQuery.query.index];
    }
    if ('index' in executableQuery.query && executableQuery.query.index) {
      return [executableQuery.query.index as string];
    }
    const v2 = executableQuery as Extract<ExecutableQuery, { resolution: IntegrationResolution }>;
    return v2.resolution.indices;
  }
}
