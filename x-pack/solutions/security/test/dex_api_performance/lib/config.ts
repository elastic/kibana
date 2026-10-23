/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';

export type ScenarioName =
  | 'cold_boot'
  | 'warm_boot'
  | 'scalability'
  | 'contention'
  | 'double_click'
  | 'memory_stability';

export interface ResultsClusterConfig {
  es_url: string;
  api_key: string;
  kibana_url?: string;
}

export interface DefaultsConfig {
  iterations: number;
  memory_sample_interval_ms: number;
  change_history_enabled: boolean;
}

export interface EnvironmentConfig {
  id: string;
  role: 'cold_boot' | 'warm_boot';
  scenarios?: ScenarioName[];
  kibana_url: string;
  es_url: string;
  credentials: string;
  kibana_memory_mb: number;
  es_heap_mb: number;
  stack_version: string;
  iterations?: number;
  notes?: string;
}

export interface PerfConfig {
  results_cluster: ResultsClusterConfig;
  defaults: DefaultsConfig;
  max_parallel_environments: number;
  environments: EnvironmentConfig[];
}

export function resolveEnvValue(value: string): string {
  if (value.startsWith('env:')) {
    const varName = value.slice(4);
    const resolved = process.env[varName];
    if (!resolved) {
      throw new Error(`Environment variable ${varName} is not set (referenced as "${value}")`);
    }
    return resolved;
  }
  return value;
}

export function parseCredentials(raw: string): { username: string; password: string } {
  const resolved = resolveEnvValue(raw);
  const sepIdx = resolved.indexOf(':');
  if (sepIdx === -1) {
    throw new Error(`Invalid credentials format: expected "user:pass", got "${resolved}"`);
  }
  return {
    username: resolved.slice(0, sepIdx),
    password: resolved.slice(sepIdx + 1),
  };
}

export function loadConfig(configPath: string): PerfConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<PerfConfig>;

  if (!parsed.results_cluster?.es_url || !parsed.results_cluster?.api_key) {
    throw new Error('results_cluster.es_url and results_cluster.api_key are required');
  }

  if (!parsed.environments || parsed.environments.length === 0) {
    throw new Error('At least one environment is required');
  }

  const seenIds = new Set<string>();
  for (const env of parsed.environments) {
    if (!env.id || !env.role || !env.kibana_url || !env.credentials) {
      throw new Error(`Environment missing required fields: ${JSON.stringify(env)}`);
    }
    if (seenIds.has(env.id)) {
      throw new Error(`Duplicate environment id: ${env.id}`);
    }
    seenIds.add(env.id);
    if (env.role !== 'cold_boot' && env.role !== 'warm_boot') {
      throw new Error(`Invalid role "${env.role}" for environment ${env.id}`);
    }
  }

  return {
    results_cluster: {
      es_url: parsed.results_cluster.es_url,
      api_key: resolveEnvValue(parsed.results_cluster.api_key),
      kibana_url: (parsed.results_cluster as Record<string, unknown>).kibana_url as string | undefined,
    },
    defaults: {
      iterations: parsed.defaults?.iterations ?? 5,
      memory_sample_interval_ms: parsed.defaults?.memory_sample_interval_ms ?? 1000,
      change_history_enabled: parsed.defaults?.change_history_enabled ?? true,
    },
    max_parallel_environments: parsed.max_parallel_environments ?? 3,
    environments: parsed.environments as EnvironmentConfig[],
  };
}
