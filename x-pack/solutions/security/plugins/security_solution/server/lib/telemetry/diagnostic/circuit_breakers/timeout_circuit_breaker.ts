/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

import type { CircuitBreakerResult } from '../health_diagnostic_circuit_breakers.types';

import { BaseCircuitBreaker } from './utils';

/**
 * Configuration interface for Timeout Circuit Breaker.
 */
export interface TimeoutCircuitBreakerConfig {
  /** Maximum allowed execution time in milliseconds before timeout. */
  timeoutMillis: number;
  /** Interval in milliseconds between timeout validations. */
  validationIntervalMs: number;
}

export class TimeoutCircuitBreaker extends BaseCircuitBreaker {
  private readonly started: number;

  constructor(private readonly config: TimeoutCircuitBreakerConfig) {
    super();
    this.started = performance.now();
  }

  async validate(): Promise<CircuitBreakerResult> {
    const now = performance.now();

    if (now > this.started + this.config.timeoutMillis) {
      return this.failure(`Timeout exceeded: ${this.config.timeoutMillis.toString()} ms`);
    }
    return this.success();
  }

  stats(): unknown {
    return {
      started: this.started,
      elapsed: performance.now() - this.started,
    };
  }

  validationIntervalMs(): number {
    return this.config.validationIntervalMs;
  }
}
