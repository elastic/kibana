/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EventLoopUtilization, performance } from 'perf_hooks';
import type { CircuitBreakerResult } from '../health_diagnostic_circuit_breakers.types';
import { BaseCircuitBreaker } from './utils';

export class EventLoopUtilizationCircuitBreaker extends BaseCircuitBreaker {
  private readonly startUtilization: EventLoopUtilization;

  constructor(private readonly config: { thresholdMillis: number; validationIntervalMs: number }) {
    super();
    this.startUtilization = performance.eventLoopUtilization();
  }

  async validate(): Promise<CircuitBreakerResult> {
    const eventLoop = performance.eventLoopUtilization(this.startUtilization);

    const exceeded = eventLoop.active > this.config.thresholdMillis;

    if (exceeded) {
      return this.failure(
        `Event loop utilization exceeded: ${eventLoop.active.toString()}, stopping`
      );
    }
    return this.success();
  }

  stats(): unknown {
    return {
      startUtilization: this.startUtilization,
    };
  }

  validationIntervalMs(): number {
    return this.config.validationIntervalMs;
  }
}
