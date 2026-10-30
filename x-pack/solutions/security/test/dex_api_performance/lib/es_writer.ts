/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { type Logger } from './logger';

export const INDEX_RUNS = 'perf-dex-prebuilt-rules-runs';
export const INDEX_ITERATIONS = 'perf-dex-prebuilt-rules-iterations';
export const INDEX_MEMORY = 'perf-dex-prebuilt-rules-memory';

export interface RunSummaryDoc {
  run_id: string;
  environment_id: string;
  environment_role: string;
  scenario: string;
  boot_type: string;
  stack_version: string;
  kibana_memory_mb: number;
  es_heap_mb: number;
  total_rules: number;
  iterations: number;
  median_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  mean_duration_ms: number;
  std_dev_ms: number;
  peak_rss_mb: number;
  peak_heap_mb: number;
  oom_events: number;
  errors: number;
}

export interface IterationDoc {
  run_id: string;
  environment_id: string;
  scenario: string;
  boot_type: string;
  iteration: number;
  total_rules: number;
  duration_ms: number;
  http_status: number;
  rules_succeeded: number;
  rules_failed: number;
  rules_skipped: number;
  rss_before_mb: number;
  rss_after_mb: number;
  heap_before_mb: number;
  heap_after_mb: number;
  delete_duration_ms: number;
  error_message?: string;
  customer_read_latency_mean_ms?: number;
  customer_read_latency_p95_ms?: number;
  concurrent_install_rejected?: boolean;
}

export interface MemorySampleDoc {
  run_id: string;
  environment_id: string;
  scenario: string;
  iteration: number;
  rss_mb: number;
  heap_used_mb: number;
  heap_total_mb: number;
  event_loop_delay_ms: number;
}

export class ESWriter {
  private readonly client: Client;

  constructor(
    esUrl: string,
    apiKey: string,
    private readonly logger: Logger
  ) {
    this.client = new Client({
      node: esUrl,
      auth: { apiKey },
      requestTimeout: 30_000,
    });
  }

  async indexIteration(doc: IterationDoc): Promise<void> {
    await this.client.index({
      index: INDEX_ITERATIONS,
      document: { '@timestamp': new Date().toISOString(), ...doc },
      refresh: 'wait_for',
    });
    this.logger.debug(`Indexed iteration`, {
      env: doc.environment_id,
      scenario: doc.scenario,
      iteration: doc.iteration,
    });
  }

  async indexRunSummary(doc: RunSummaryDoc): Promise<void> {
    await this.client.index({
      index: INDEX_RUNS,
      document: { '@timestamp': new Date().toISOString(), ...doc },
      refresh: 'wait_for',
    });
    this.logger.debug(`Indexed run summary`, {
      env: doc.environment_id,
      scenario: doc.scenario,
    });
  }

  async bulkIndexMemorySamples(
    docs: Array<MemorySampleDoc & { '@timestamp': string }>
  ): Promise<void> {
    if (docs.length === 0) return;

    const operations = docs.flatMap((doc) => [{ index: { _index: INDEX_MEMORY } }, doc]);

    const result = await this.client.bulk({ operations, refresh: 'wait_for' });

    if (result.errors) {
      const firstError = result.items.find((item) => item.index?.error);
      this.logger.warn(`Bulk index memory samples had errors`, {
        first_error: JSON.stringify(firstError?.index?.error),
      });
    }

    this.logger.debug(`Bulk indexed ${docs.length} memory samples`);
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  getClient(): Client {
    return this.client;
  }
}
