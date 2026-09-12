/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaClient } from '../lib/kibana_client';
import { type MemorySampler } from '../lib/memory_sampler';
import { type ESWriter } from '../lib/es_writer';
import { type EnvironmentConfig, type ScenarioName } from '../lib/config';
import { type Logger } from '../lib/logger';

export interface ScenarioContext {
  client: KibanaClient;
  sampler: MemorySampler;
  writer: ESWriter;
  runId: string;
  envConfig: EnvironmentConfig;
  iterations: number;
  logger: Logger;
}

export interface IterationResult {
  iteration: number;
  duration_ms: number;
  http_status: number;
  rules_succeeded: number;
  rules_failed: number;
  rules_skipped: number;
  total_rules: number;
  delete_duration_ms: number;
  rss_before_mb: number;
  rss_after_mb: number;
  heap_before_mb: number;
  heap_after_mb: number;
  error_message?: string;
  customer_read_latency_mean_ms?: number;
  customer_read_latency_p95_ms?: number;
  concurrent_install_rejected?: boolean;
}

export interface ScenarioResult {
  scenario: ScenarioName;
  boot_type: string;
  iterations: IterationResult[];
}

export interface Scenario {
  name: ScenarioName;
  run(ctx: ScenarioContext): Promise<ScenarioResult>;
}

const BYTES_TO_MB = 1 / (1024 * 1024);

export function metricsToMb(metrics: {
  rss_bytes: number;
  heap_used_bytes: number;
} | null): { rss_mb: number; heap_mb: number } {
  if (!metrics) return { rss_mb: 0, heap_mb: 0 };
  return {
    rss_mb: round(metrics.rss_bytes * BYTES_TO_MB),
    heap_mb: round(metrics.heap_used_bytes * BYTES_TO_MB),
  };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
