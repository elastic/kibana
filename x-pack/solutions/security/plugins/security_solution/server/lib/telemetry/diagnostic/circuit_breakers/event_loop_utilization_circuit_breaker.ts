/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EventLoopUtilization, performance } from 'perf_hooks';
import type {
  CircuitBreaker,
  CircuitBreakerResult,
} from '../health_diagnostic_circuit_breakers.types';
import { failure, success } from './utils';

export class EventLoopUtilizationCircuitBreaker implements CircuitBreaker {
  private readonly startUtilization: EventLoopUtilization;

  constructor(private readonly config: { thresholdMillis: number; validationIntervalMs: number }) {
    this.startUtilization = performance.eventLoopUtilization();
  }

  async validate(): Promise<CircuitBreakerResult> {
    const eventLoop = performance.eventLoopUtilization(this.startUtilization);

    const exceeded = eventLoop.active > this.config.thresholdMillis;

    if (exceeded) {
      return failure(`Event loop utilization exceeded: ${eventLoop.active.toString()}, stopping`);
    }
    return success();
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
