/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalHistogram } from '@kbn/core-metrics-server';
import { type IntervalHistogram as PerfIntervalHistogram, monitorEventLoopDelay } from 'perf_hooks';
import type { CircuitBreakerResult } from '../health_diagnostic_circuit_breakers.types';
import { BaseCircuitBreaker } from './utils';

export const ONE_MILLISECOND_AS_NANOSECONDS = 1_000_000;

/**
 * Configuration interface for Event Loop Delay Circuit Breaker.
 */
export interface EventLoopDelayCircuitBreakerConfig {
  /** Threshold in milliseconds for event loop delay before triggering. */
  thresholdMillis: number;
  /** Interval in milliseconds between event loop delay measurements. */
  validationIntervalMs: number;
}

export class EventLoopDelayCircuitBreaker extends BaseCircuitBreaker {
  private readonly loopMonitor: PerfIntervalHistogram;
  private fromTimestamp: Date;
  private lastHistogram: IntervalHistogram = {
    min: 0,
    max: 0,
    mean: 0,
    exceeds: 0,
    stddev: 0,
    fromTimestamp: '',
    lastUpdatedAt: '',
    percentiles: {
      50: 0,
      75: 0,
      90: 0,
      95: 0,
      99: 0,
    },
  };

  constructor(private readonly config: EventLoopDelayCircuitBreakerConfig) {
    super();
    const monitor = monitorEventLoopDelay();
    monitor.enable();
    this.fromTimestamp = new Date();
    this.loopMonitor = monitor;
  }

  async validate(): Promise<CircuitBreakerResult> {
    const lastUpdated = new Date();
    this.loopMonitor.disable();
    const { min: minNs, max: maxNs, mean: meanNs, exceeds, stddev: stddevNs } = this.loopMonitor;

    this.lastHistogram = {
      min: this.nsToMs(minNs),
      max: this.nsToMs(maxNs),
      mean: this.nsToMs(meanNs),
      exceeds,
      stddev: this.nsToMs(stddevNs),
      fromTimestamp: this.fromTimestamp.toISOString(),
      lastUpdatedAt: lastUpdated.toISOString(),
      percentiles: {
        50: this.nsToMs(this.loopMonitor.percentile(50)),
        75: this.nsToMs(this.loopMonitor.percentile(75)),
        90: this.nsToMs(this.loopMonitor.percentile(90)),
        95: this.nsToMs(this.loopMonitor.percentile(95)),
        99: this.nsToMs(this.loopMonitor.percentile(99)),
      },
    };

    this.loopMonitor.enable();

    if (this.lastHistogram.mean > this.config.thresholdMillis) {
      return this.failure(
        `Event loop delay mean ${this.lastHistogram.mean.toFixed(2)}ms exceeds threshold`
      );
    }

    return this.success();
  }

  stats(): unknown {
    return this.lastHistogram;
  }

  validationIntervalMs(): number {
    return this.config.validationIntervalMs;
  }

  private nsToMs(metric: number) {
    return metric / ONE_MILLISECOND_AS_NANOSECONDS;
  }
}
