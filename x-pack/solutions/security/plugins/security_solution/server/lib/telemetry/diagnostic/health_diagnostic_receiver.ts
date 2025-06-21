/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filter,
  finalize,
  map,
  merge,
  type Observable,
  Subject,
  type Subscription,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  Duration,
  ExpandWildcards,
  Indices,
  SearchPointInTimeReference,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { cloneDeep } from 'lodash';
import type { QueryConfig, CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import type {
  CircuitBreaker,
  CircuitBreakerResult,
} from './health_diagnostic_circuit_breakers.types';

export class CircuitBreakingQueryExecutorImpl implements CircuitBreakingQueryExecutor {
  constructor(private client: ElasticsearchClient) {}

  public search<T>(queryConfig: QueryConfig): AsyncIterable<T> {
    const { query, circuitBreakers } = queryConfig;

    const upstream$ = new Subject<unknown[]>();
    const stop$ = new Subject<void>();

    if (query.aggs) {
      this.streamSearchAggrs(query, upstream$, stop$).catch((err: unknown) => {
        upstream$.error(err);
      });
    } else {
      this.streamSearchDocs(query, upstream$, stop$).catch((err: unknown) => {
        upstream$.error(err);
      });
    }

    const circuitBreakers$ = this.configureCircuitBreakers(circuitBreakers);
    return {
      [Symbol.asyncIterator]() {
        const queue: T[] = [];
        const resolvers: Array<(value: IteratorResult<T>) => void> = [];
        let isDone = false;

        const sub = upstream$
          .pipe(
            takeUntil(circuitBreakers$),
            finalize(() => {
              stop$.next();
            })
          )
          .subscribe({
            next: (value) => {
              if (resolvers.length) {
                const resolve = resolvers.shift();
                if (resolve) {
                  resolve({ value: value as T, done: false });
                } else {
                  queue.push(value as T);
                }
              } else {
                queue.push(value as T);
              }
            },
            complete: () => {
              isDone = true;
              resolvers.forEach((r) => {
                r({ value: undefined as T, done: true });
              });
              resolvers.length = 0;
            },
            error: (err: unknown) => {
              resolvers.forEach((r) => {
                r(Promise.reject(err) as unknown as IteratorResult<T>);
              });
              resolvers.length = 0;
            },
          });

        return {
          async next(): Promise<IteratorResult<T>> {
            if (queue.length) {
              const value = queue.shift();
              if (value) {
                return { value, done: true };
              }
            }
            if (isDone) {
              return { value: undefined as T, done: true };
            }
            return new Promise((resolve) => resolvers.push(resolve));
          },
          async return(): Promise<IteratorResult<T>> {
            sub.unsubscribe();
            return Promise.resolve({ value: undefined as T, done: true });
          },
          async throw(error: Error): Promise<IteratorResult<T>> {
            sub.unsubscribe();
            return Promise.reject(error);
          },
        };
      },
    };
  }

  async streamSearchDocs<T>(
    query: SearchRequest,
    collector$: Subject<T[]>,
    stop$: Subject<void>,
    keepAlive: Duration = '5m'
  ): Promise<void> {
    if (!query.sort) {
      throw Error('Not possible to paginate a query without a sort attribute');
    }

    if (!query.index) {
      throw Error('query must have index attribute');
    }

    const controller = new AbortController();
    const abortSignal = controller.signal;

    let hasMore = true;
    let cancelled = false;

    let stopSub: Subscription | undefined;
    let pit: SearchPointInTimeReference | undefined;

    try {
      stopSub = stop$.subscribe(() => {
        controller.abort();
        cancelled = true;
      });

      pit = await this.openPointInTime(query.index, abortSignal, keepAlive);

      const esQuery: SearchRequest = {
        ...cloneDeep(query),
        pit,
      };

      delete esQuery.index;

      while (hasMore && !cancelled) {
        const response = await this.client.search(esQuery, { signal: abortSignal });

        const hits = response.hits.hits;

        esQuery.search_after = response.hits.hits[hits.length - 1]?.sort;

        const data = hits.flatMap((h) => (h._source != null ? ([h._source] as T[]) : []));

        hasMore = hits.length > 0;
        if (hasMore) {
          collector$.next(data);
        }
      }
      collector$.complete();
    } catch (err: unknown) {
      collector$.error(err);
    } finally {
      if (stopSub) {
        stopSub.unsubscribe();
      }
      if (pit) {
        await this.closePointInTime(pit.id, abortSignal);
      }
    }
  }

  async streamSearchAggrs<T>(
    query: SearchRequest,
    collector$: Subject<T[]>,
    stop$: Subject<void>
  ): Promise<void> {
    if (!query.aggs) {
      throw Error('query must have aggs attribute');
    }

    if (!query.index) {
      throw Error('query must have index attribute');
    }

    const controller = new AbortController();
    const abortSignal = controller.signal;

    let stopSub: Subscription | undefined;

    try {
      stopSub = stop$.subscribe(() => {
        controller.abort();
      });

      const esQuery: SearchRequest = {
        ...cloneDeep(query),
        size: 0,
      };

      const response = await this.client.search(esQuery, { signal: abortSignal });

      if (response.aggregations) {
        collector$.next([response.aggregations as T]);
      } else {
        throw new Error('No aggregations found in the response');
      }
      collector$.complete();
    } catch (err: unknown) {
      collector$.error(err);
    } finally {
      if (stopSub) {
        stopSub.unsubscribe();
      }
    }
  }

  async openPointInTime(
    index: Indices,
    abortSignal: AbortSignal,
    keepAlive: Duration = '5m',
    expandWildcards: ExpandWildcards = ['open', 'hidden']
  ): Promise<SearchPointInTimeReference> {
    return this.client
      .openPointInTime(
        {
          index,
          keep_alive: keepAlive,
          expand_wildcards: expandWildcards,
        },
        { signal: abortSignal }
      )
      .then((response) => {
        return {
          id: response.id,
          keep_alive: keepAlive,
        };
      });
  }

  async closePointInTime(pitId: string, abortSignal: AbortSignal) {
    await this.client.closePointInTime({ id: pitId }, { signal: abortSignal });
  }

  configureCircuitBreakers(circuitBreakers: CircuitBreaker[]): Observable<CircuitBreakerResult> {
    return merge(
      ...circuitBreakers.map((cb) =>
        timer(0, cb.validationIntervalMs()).pipe(
          map(() => cb.validate()),
          filter((result) => !result.valid)
        )
      )
    ).pipe(
      tap((result) => {
        throw new Error(result.message);
      })
    );
  }
}
