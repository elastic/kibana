/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { CircuitBreaker } from './health_diagnostic_circuit_breakers.types';
import type { ExecutableQuery } from './health_diagnostic_service.types';

export interface QueryConfig {
  query: ExecutableQuery;
  circuitBreakers: CircuitBreaker[];
}

/**
 * Run Elasticsearch queries applying circuit breaker validations.
 */
export interface CircuitBreakingQueryExecutor {
  /**
   * Executes the provided query and returns an async iterable over the result set.
   *
   * @param queryConfig - Configuration including the query and circuit breakers.
   * @returns An async iterable of results matching the query.
   */
  search<T>(queryConfig: QueryConfig): Observable<T>;
}
