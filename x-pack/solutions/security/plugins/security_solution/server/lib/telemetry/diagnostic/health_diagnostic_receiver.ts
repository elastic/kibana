/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, finalize, merge, type Observable, Subject, takeUntil, tap, timer } from 'rxjs';
import * as rx from 'rxjs';
import type { ElasticsearchClient, LogMeta, Logger } from '@kbn/core/server';
import type { EqlSearchRequest, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { QueryConfig, CircuitBreakingQueryExecutor } from './health_diagnostic_receiver.types';
import type {
  CircuitBreaker,
  CircuitBreakerResult,
} from './health_diagnostic_circuit_breakers.types';
import { type HealthDiagnosticQuery, QueryType } from './health_diagnostic_service.types';
import type { TelemetryLogger } from '../telemetry_logger';
import { newTelemetryLogger } from '../helpers';

export class CircuitBreakingQueryExecutorImpl implements CircuitBreakingQueryExecutor {
  private readonly logger: TelemetryLogger;

  constructor(private client: ElasticsearchClient, logger: Logger) {
    this.logger = newTelemetryLogger(logger.get('health_diagnostic.receiver'));
  }

  async search<T>(queryConfig: QueryConfig): Promise<T[]> {
    const { query, circuitBreakers } = queryConfig;

    const upstream$ = new Subject<T[]>();
    const stop$ = new Subject<void>();

    switch (query.type) {
      case QueryType.DSL:
        this.streamDsl(query, upstream$, stop$).catch((err: unknown) => {
          upstream$.error(err);
        });
        break;
      case QueryType.EQL:
        this.streamEql(query, upstream$, stop$).catch((err: unknown) => {
          upstream$.error(err);
        });
        break;
      case QueryType.ESQL:
        this.streamEsql(query, upstream$, stop$).catch((err: unknown) => {
          upstream$.error(err);
        });
        break;
      default: {
        const exhaustiveCheck: never = query.type;
        throw new Error(`Unhandled QueryType: ${exhaustiveCheck}`);
      }
    }

    return rx.firstValueFrom(
      upstream$.pipe(
        takeUntil(this.configureCircuitBreakers(circuitBreakers)),
        finalize(() => {
          stop$.next();
        })
      )
    );
  }

  async streamDsl<T>(
    diagnosticQuery: HealthDiagnosticQuery,
    collector$: Subject<T[]>,
    stop$: Subject<void>
  ): Promise<void> {
    const controller = new AbortController();
    const abortSignal = controller.signal;

    const stopSub: rx.Subscription = stop$.subscribe(() => {
      controller.abort();
    });

    const request: SearchRequest = JSON.parse(diagnosticQuery.query) as SearchRequest;
    try {
      const response = await this.client.search(
        {
          index: diagnosticQuery.index,
          ...request,
        },
        { signal: abortSignal }
      );

      if (response.aggregations) {
        collector$.next([response.aggregations as T]);
      } else if (response.hits.hits.length > 0) {
        const hits = response.hits.hits;
        const data = hits.flatMap((h) => (h._source != null ? ([h._source] as T[]) : []));
        collector$.next(data);
      } else {
        this.logger.warn('Neither aggregations nor hits found in the response for query', {
          query: diagnosticQuery.name,
        } as LogMeta);
        collector$.next([]);
      }
    } finally {
      stopSub.unsubscribe();
    }
  }

  async streamEsql<T>(
    diagnosticQuery: HealthDiagnosticQuery,
    collector$: Subject<T[]>,
    stop$: Subject<void>
  ): Promise<void> {
    const controller = new AbortController();
    const abortSignal = controller.signal;
    const regex = /^[\s\r\n]*FROM/;

    const stopSub: rx.Subscription = stop$.subscribe(() => {
      controller.abort();
    });

    const query = regex.test(diagnosticQuery.query)
      ? diagnosticQuery.query
      : `FROM ${diagnosticQuery.index} | ${diagnosticQuery.query}`;

    try {
      const response = await this.client.helpers
        .esql({ query }, { signal: abortSignal })
        .toRecords();

      collector$.next(response.records as T[]);
    } finally {
      stopSub.unsubscribe();
    }
  }

  async streamEql<T>(
    diagnosticQuery: HealthDiagnosticQuery,
    collector$: Subject<T[]>,
    stop$: Subject<void>
  ): Promise<void> {
    const controller = new AbortController();
    const abortSignal = controller.signal;

    const stopSub: rx.Subscription = stop$.subscribe(() => {
      controller.abort();
    });
    try {
      const request: EqlSearchRequest = {
        index: diagnosticQuery.index,
        query: diagnosticQuery.query,
      };

      const response = await this.client.eql.search(request, { signal: abortSignal });

      if (response.hits.events) {
        const data = response.hits.events.flatMap((h) =>
          h._source != null ? ([h._source] as T[]) : []
        );
        collector$.next(data);
      } else if (response.hits.sequences) {
        const data = response.hits.sequences.map((seq) => {
          return seq.events.flatMap((h) =>
            h._source != null ? ([h._source] as unknown[]) : []
          ) as T;
        });
        collector$.next(data);
      } else {
        this.logger.warn(
          '>> Neither hits.events nor hits.sequences found in the response for query',
          { query: diagnosticQuery.name } as LogMeta
        );
        collector$.next([]);
      }
    } finally {
      stopSub.unsubscribe();
    }
  }

  configureCircuitBreakers(circuitBreakers: CircuitBreaker[]): Observable<CircuitBreakerResult> {
    return merge(
      ...circuitBreakers.map((cb) =>
        timer(0, cb.validationIntervalMs()).pipe(
          rx.mergeMap(() => rx.from(cb.validate())),
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
