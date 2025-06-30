/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CircuitBreaker,
  CircuitBreakerResult,
} from '../health_diagnostic_circuit_breakers.types';
import { failure, success } from './utils';

export class RssGrouthCircuitBreaker implements CircuitBreaker {
  private readonly initialRss: number;
  private maxRss: number;
  private maxPercentGrowth: number;

  constructor(
    private readonly config: {
      maxRssGrowthPercent: number;
      validationIntervalMs: number;
    }
  ) {
    if (config.maxRssGrowthPercent < 0 || config.maxRssGrowthPercent > 1) {
      throw new Error('maxRssGrowthPercent must be between 0 and 1');
    }

    this.initialRss = process.memoryUsage().rss;
    this.maxRss = this.initialRss;
    this.maxPercentGrowth = 0;
  }

  async validate(): Promise<CircuitBreakerResult> {
    const currentRss = process.memoryUsage().rss;
    const percentGrowth = (currentRss - this.initialRss) / this.initialRss;

    this.maxRss = Math.max(this.maxRss, currentRss);
    this.maxPercentGrowth = Math.max(this.maxPercentGrowth, percentGrowth);

    if (percentGrowth > this.config.maxRssGrowthPercent) {
      return failure(
        `RSS growth exceeded: ${(percentGrowth * 100).toFixed(2)}% - max allowed: ${(
          this.config.maxRssGrowthPercent * 100
        ).toFixed(2)}%`
      );
    }
    return success();
  }

  stats(): unknown {
    return {
      initialRss: this.initialRss,
      maxRss: this.maxRss,
      maxPercentGrowth: this.maxPercentGrowth,
    };
  }

  validationIntervalMs(): number {
    return this.config.validationIntervalMs;
  }
}
