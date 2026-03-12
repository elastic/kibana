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
  type Observable,
  takeUntil,
  map,
  timer,
} from 'rxjs';
import * as rx from 'rxjs';
import type { ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import type {
  EqlSearchRequest,
  SearchRequest,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { QueryConfig, CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import {
  ValidationError,
  type CircuitBreaker,
  type CircuitBreakerResult,
} from './health_diagnostic_circuit_breakers.types';
import { type HealthDiagnosticQuery, QueryType } from './health_diagnostic_service.types';
import type { TelemetryLogger } from '../telemetry_logger';
import { newTelemetryLogger, withErrorMessage } from '../helpers';

export class CircuitBreakingQueryExecutorImpl implements CircuitBreakingQueryExecutor {
  private readonly logger: TelemetryLogger;

  constructor(private client: ElasticsearchClient, logger: Logger) {
    this.logger = newTelemetryLogger(logger.get('circuit-breaking-query-executor'));
  }

  search<T>({ query, circuitBreakers }: QueryConfig): Observable<T> {
    const controller = new AbortController();
    const abortSignal = controller.signal;
    const circuitBreakers$ = this.configureCircuitBreakers(circuitBreakers, controller);

    switch (query.type) {
      case QueryType.DSL:
        return this.streamDSL<T>(query, abortSignal).pipe(takeUntil(circuitBreakers$));
      case QueryType.EQL:
        return this.streamEql<T>(query, abortSignal).pipe(takeUntil(circuitBreakers$));
      case QueryType.ESQL:
        return this.streamEsql<T>(query, abortSignal).pipe(takeUntil(circuitBreakers$));
      default: {
        const exhaustiveCheck: never = query.type;
        throw new Error(`Unhandled QueryType: ${exhaustiveCheck}`);
      }
    }
  }

  streamEsql<T>(diagnosticQuery: HealthDiagnosticQuery, abortSignal: AbortSignal): Observable<T> {
    const regex = /^[\s\r\n]*FROM/;

    return from(this.indicesFor(diagnosticQuery)).pipe(
      mergeMap((index) => {
        const query = regex.test(diagnosticQuery.query)
          ? diagnosticQuery.query
          : `FROM ${index} | ${diagnosticQuery.query}`;

        return from(this.client.helpers.esql({ query }, { signal: abortSignal }).toRecords()).pipe(
          mergeMap((resp) => {
            return resp.records.map((r) => r as T);
          })
        );
      })
    );
  }

  streamEql<T>(diagnosticQuery: HealthDiagnosticQuery, abortSignal: AbortSignal): Observable<T> {
    return from(this.indicesFor(diagnosticQuery)).pipe(
      mergeMap((index) => {
        const request: EqlSearchRequest = {
          index,
          query: diagnosticQuery.query,
          size: diagnosticQuery.size,
        };

        return from(this.client.eql.search(request, { signal: abortSignal })).pipe(
          mergeMap((resp) => {
            if (resp.hits.events) {
              return resp.hits.events.map((h) => h._source as T);
            } else if (resp.hits.sequences) {
              return resp.hits.sequences.map((seq) => seq.events.map((h) => h._source) as T);
            } else {
              this.logger.warn(
                '>> Neither hits.events nor hits.sequences found in the response for query',
                { queryName: diagnosticQuery.name } as LogMeta
              );
              return [];
            }
          })
        );
      })
    );
  }

  streamDSL<T>(
    diagnosticQuery: HealthDiagnosticQuery,
    abortSignal: AbortSignal,
    pitKeepAlive: string = '1m'
  ): Observable<T> {
    let pitId: string;
    let searchAfter: SortResults | undefined;
    const pageSize = diagnosticQuery.size ?? 10000;

    const query: SearchRequest = JSON.parse(diagnosticQuery.query) as SearchRequest;

    const fetchPage = () => {
      const paginatedRequest: SearchRequest = {
        size: pageSize,
        sort: [{ _shard_doc: 'asc' }],
        search_after: searchAfter,
        pit: { id: pitId, keep_alive: pitKeepAlive },
        ...query,
      };
      return this.client.search<T>(paginatedRequest, { signal: abortSignal });
    };

    return from(this.indicesFor(diagnosticQuery)).pipe(
      mergeMap((index) => from(this.client.openPointInTime({ index, keep_alive: pitKeepAlive }))),

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
        this.client.closePointInTime({ id: pitId }).catch((error) => {
          this.logger.warn('>> closePointInTime error', withErrorMessage(error));
        });
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
   * When running in serverless or `query.index` is not managed by an ILM, returns
   * the same `query.index`.
   *
   * @param query The health diagnostic query object.
   * @returns A Promise resolving to an array of indices.
   */
  async indicesFor(query: HealthDiagnosticQuery): Promise<string[]> {
    if (query.tiers === undefined) {
      this.logger.debug('No tiers defined in the query, returning index as is', {
        queryName: query.name,
      } as LogMeta);
      return [query.index];
    }
    const tiers = query.tiers;

    return this.client.ilm
      .explainLifecycle({
        index: query.index,
        only_managed: false,
        filter_path: ['indices.*.phase'],
      })
      .then((response) => {
        if (response.indices === undefined) {
          this.logger.debug(
            'Got an empty response while explaining lifecycle. Asumming serverless.',
            {
              index: query.index,
            } as LogMeta
          );
          return [query.index];
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
              // should not happen, but just in case
              this.logger.debug('Index is not managed by an ILM', {
                index: indexName,
                tiers,
              } as LogMeta);
              return '';
            }
          });
          this.logger.debug('Indices managed by ILM', {
            queryName: query.name,
            tiers: query.tiers,
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
        return [query.index];
      });
  }
}
