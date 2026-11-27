/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaClient, type ProcessMemoryMetrics } from './kibana_client';
import { type Logger } from './logger';

export interface MemorySample {
  '@timestamp': string;
  rss_mb: number;
  heap_used_mb: number;
  heap_total_mb: number;
  event_loop_delay_ms: number;
}

const BYTES_TO_MB = 1 / (1024 * 1024);

export class MemorySampler {
  private samples: MemorySample[] = [];
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly client: KibanaClient,
    private readonly intervalMs: number,
    private readonly logger: Logger
  ) {}

  start(): void {
    this.samples = [];
    this.running = true;
    this.poll();
  }

  stop(): MemorySample[] {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return [...this.samples];
  }

  getLatest(): ProcessMemoryMetrics | null {
    if (this.samples.length === 0) return null;
    const last = this.samples[this.samples.length - 1];
    return {
      heap_used_bytes: last.heap_used_mb / BYTES_TO_MB,
      heap_total_bytes: last.heap_total_mb / BYTES_TO_MB,
      rss_bytes: last.rss_mb / BYTES_TO_MB,
      event_loop_delay_ms: last.event_loop_delay_ms,
    };
  }

  private poll(): void {
    if (!this.running) return;

    this.client
      .getProcessMetrics()
      .then((metrics) => {
        if (metrics && this.running) {
          this.samples.push({
            '@timestamp': new Date().toISOString(),
            rss_mb: round(metrics.rss_bytes * BYTES_TO_MB),
            heap_used_mb: round(metrics.heap_used_bytes * BYTES_TO_MB),
            heap_total_mb: round(metrics.heap_total_bytes * BYTES_TO_MB),
            event_loop_delay_ms: round(metrics.event_loop_delay_ms),
          });
        }
      })
      .catch((err) => {
        this.logger.debug(`Memory sample failed: ${err}`);
      })
      .finally(() => {
        if (this.running) {
          this.timer = setTimeout(() => this.poll(), this.intervalMs);
        }
      });
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
