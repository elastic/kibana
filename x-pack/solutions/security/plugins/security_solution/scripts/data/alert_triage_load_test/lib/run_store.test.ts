/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { RunManifest } from './run_store';
import { assertRunIsNew, buildRunPaths, createRunManifest, readJson, writeJson } from './run_store';

const buildManifest = (overrides: Partial<RunManifest> = {}): RunManifest => ({
  runId: 'run-1',
  startedAt: '2026-09-30T12:00:00.000Z',
  kibanaUrl: 'http://localhost:5601',
  elasticsearchUrl: 'http://localhost:9200',
  spaceId: 'default',
  alertsIndex: '.alerts-security.alerts-default',
  workerWorkflowId: 'worker',
  childWorkflowIds: [],
  parameters: {},
  worker: undefined,
  analysisRuntimeConfig: undefined,
  plan: { batches: 1, alerts: 10, falsePositiveAlerts: 5, lastDispatchOffsetMs: 0 },
  ...overrides,
});

describe('run directory', () => {
  let outDir: string;

  beforeEach(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-load-test-'));
  });

  afterEach(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('creates the manifest of a new run', () => {
    const paths = buildRunPaths(outDir, 'run-1');

    createRunManifest(paths, buildManifest());

    expect(readJson<RunManifest>(paths.manifest)).toMatchObject({ runId: 'run-1' });
  });

  it('rejects a run id that was already started and leaves its files untouched', () => {
    const paths = buildRunPaths(outDir, 'run-1');
    createRunManifest(paths, buildManifest({ gitSha: 'first' }));

    expect(() => createRunManifest(paths, buildManifest({ gitSha: 'second' }))).toThrow(
      'Run "run-1" already exists'
    );
    expect(readJson<RunManifest>(paths.manifest).gitSha).toBe('first');
  });

  it('lets a run update its own manifest afterwards', () => {
    const paths = buildRunPaths(outDir, 'run-1');
    createRunManifest(paths, buildManifest());

    writeJson(paths.manifest, buildManifest({ endedAt: '2026-09-30T12:30:00.000Z' }));

    expect(readJson<RunManifest>(paths.manifest).endedAt).toBe('2026-09-30T12:30:00.000Z');
  });

  it('accepts a run id that was not used before', () => {
    createRunManifest(buildRunPaths(outDir, 'run-1'), buildManifest());

    expect(() => assertRunIsNew(buildRunPaths(outDir, 'run-2'), 'run-2')).not.toThrow();
  });

  it('rejects a run id that was started before', () => {
    const paths = buildRunPaths(outDir, 'run-1');
    createRunManifest(paths, buildManifest());

    expect(() => assertRunIsNew(paths, 'run-1')).toThrow('pick another --run-id or --out-dir');
  });

  it('accepts a run id that only has the plan of an earlier dry run', () => {
    const paths = buildRunPaths(outDir, 'run-1');
    writeJson(paths.plan, { batches: [] });

    expect(() => assertRunIsNew(paths, 'run-1')).not.toThrow();
  });
});
