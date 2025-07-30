/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CircuitBreakerResult } from '../health_diagnostic_circuit_breakers.types';
import { BaseCircuitBreaker } from './utils';

export class RssGrowthCircuitBreaker extends BaseCircuitBreaker {
  private readonly initialRss: number;
  private maxRss: number;
  private maxPercentGrowth: number;

  constructor(
    private readonly config: {
      maxRssGrowthPercent: number;
      validationIntervalMs: number;
    }
  ) {
    super();
    if (config.maxRssGrowthPercent < 0 || config.maxRssGrowthPercent > 100) {
      throw new Error('maxRssGrowthPercent must be between 0 and 100');
    }

    this.initialRss = process.memoryUsage().rss;
    this.maxRss = this.initialRss;
    this.maxPercentGrowth = 0;
  }

  async validate(): Promise<CircuitBreakerResult> {
    const currentRss = process.memoryUsage().rss;
    const percentGrowth = ((currentRss - this.initialRss) / this.initialRss) * 100;

    this.maxRss = Math.max(this.maxRss, currentRss);
    this.maxPercentGrowth = Math.max(this.maxPercentGrowth, percentGrowth);

    if (percentGrowth > this.config.maxRssGrowthPercent) {
      return this.failure(
        `RSS growth exceeded: ${percentGrowth.toFixed(2)}% - max allowed: ${
          this.config.maxRssGrowthPercent
        }%`
      );
    }
    return this.success();
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
