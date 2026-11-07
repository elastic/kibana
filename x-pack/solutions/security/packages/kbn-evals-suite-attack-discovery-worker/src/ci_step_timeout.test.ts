/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { WORKER_SCENARIOS } from '../datasets/worker_rows';
import { getPlaywrightTestTimeoutMs } from './constants';

const SUITE_ID = 'security-attack-discovery-worker';
const SUITES_CONFIG = Path.resolve(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json');

interface EvalsSuiteEntry {
  id: string;
  stepTimeoutInMinutes?: number;
}

describe('CI step timeout', () => {
  // Buildkite kills the step at `stepTimeoutInMinutes` (default 120). If that is shorter than the
  // Playwright test timeout, a slow model loses every score instead of hitting the suite's own
  // labeled row timeouts.
  it('leaves the Buildkite step longer than the Playwright test timeout', () => {
    const { suites } = JSON.parse(Fs.readFileSync(SUITES_CONFIG, 'utf-8')) as {
      suites: EvalsSuiteEntry[];
    };
    const suite = suites.find(({ id }) => id === SUITE_ID);

    const stepTimeoutMs = (suite?.stepTimeoutInMinutes ?? 120) * 60_000;

    expect(stepTimeoutMs).toBeGreaterThan(getPlaywrightTestTimeoutMs(WORKER_SCENARIOS.length));
  });
});
