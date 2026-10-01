/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { MetricsSample } from './collector';
import type { DispatchRecord } from './types';

/** What `report` and `clean` need to know about a finished (or aborted) run. */
export interface RunManifest {
  runId: string;
  startedAt: string;
  endedAt?: string;
  gitSha?: string;
  gitBranch?: string;
  kibanaUrl: string;
  elasticsearchUrl: string;
  spaceId: string;
  alertsIndex: string;
  workerWorkflowId: string;
  childWorkflowIds: string[];
  /** Flags that shape the load; credentials are never stored. */
  parameters: Record<string, unknown>;
  worker: unknown;
  analysisRuntimeConfig: unknown;
  plan: {
    batches: number;
    alerts: number;
    falsePositiveAlerts: number;
    lastDispatchOffsetMs: number;
  };
}

export interface RunPaths {
  dir: string;
  manifest: string;
  plan: string;
  dispatches: string;
  samples: string;
  taskManagerRaw: string;
  report: string;
  summary: string;
}

export const buildRunPaths = (outDir: string, runId: string): RunPaths => {
  const dir = path.resolve(outDir, runId);
  return {
    dir,
    manifest: path.join(dir, 'manifest.json'),
    plan: path.join(dir, 'plan.json'),
    dispatches: path.join(dir, 'dispatches.ndjson'),
    samples: path.join(dir, 'samples.ndjson'),
    taskManagerRaw: path.join(dir, 'task_manager_raw.ndjson'),
    report: path.join(dir, 'report.json'),
    summary: path.join(dir, 'summary.md'),
  };
};

export const writeJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

export const readJson = <T>(file: string): T => {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; is --run-id / --out-dir correct?`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
};

export const readNdjson = <T>(file: string): T[] => {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
};

export const appendNdjson = (file: string, value: unknown): void => {
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`);
};

export const readDispatches = (paths: RunPaths): DispatchRecord[] =>
  readNdjson<DispatchRecord>(paths.dispatches);

export const readSamples = (paths: RunPaths): MetricsSample[] =>
  readNdjson<MetricsSample>(paths.samples);
