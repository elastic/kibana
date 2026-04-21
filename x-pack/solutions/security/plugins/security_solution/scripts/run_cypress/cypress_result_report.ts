/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { normalizeSpecPath } from './buildkite_checkpoint';

/**
 * Describes the outcome of a single `cypress.run()` invocation for a spec.
 *
 * - `success`: runs array present and `totalFailed === 0`.
 * - `assertion_failure`: runs array present and `totalFailed > 0`.
 * - `runner_failure`: Cypress itself could not run the spec, either because
 *    it returned a `CypressFailedRunResult` (`status === 'failed'`) or because
 *    the promise threw and was caught upstream.
 * - `undefined_result`: `cypress.run()` resolved with `undefined` (anomalous).
 */
export type CypressResultKind =
  | 'success'
  | 'assertion_failure'
  | 'runner_failure'
  | 'undefined_result';

export interface CypressResultRecord {
  spec: string;
  kind: CypressResultKind;
  totalFailed?: number;
  status?: string;
  message?: string;
  durationMs?: number;
  isRetryRun: boolean;
}

interface PersistedRecord extends Omit<CypressResultRecord, 'spec'> {
  timestamp: string;
  spec: string;
  buildkite: {
    buildNumber?: string;
    jobId?: string;
    stepId?: string;
    parallelJob?: string;
    retryCount?: string;
    agentName?: string;
  };
}

const RESULTS_DIR_REL = path.join('target', 'cypress-results');

let resolvedFilePath: string | undefined;
let dirEnsured = false;

const shortId = (value: string | undefined, length = 8): string => {
  if (!value) return 'unknown';
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.length > length ? cleaned.slice(0, length) : cleaned || 'unknown';
};

/**
 * Per-attempt filename scoped to `(retryCount, parallelJob, stepId)` so that
 * Buildkite artifact uploads accumulate one file per attempt instead of
 * overwriting each other when a job is preempted and retried.
 */
const buildFilePath = (): string => {
  const retry = process.env.BUILDKITE_RETRY_COUNT ?? '0';
  const parallelJob = process.env.BUILDKITE_PARALLEL_JOB ?? '0';
  const stepIdShort = shortId(process.env.BUILDKITE_STEP_ID);
  const filename = `cypress-attempt-${retry}-job-${parallelJob}-${stepIdShort}.ndjson`;
  return path.join(REPO_ROOT, RESULTS_DIR_REL, filename);
};

export const getReportFilePath = (): string => {
  if (!resolvedFilePath) {
    resolvedFilePath = buildFilePath();
  }
  return resolvedFilePath;
};

const ensureDir = (filePath: string): void => {
  if (dirEnsured) return;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    dirEnsured = true;
  } catch {
    // Best-effort: swallow so the writer never breaks tests.
  }
};

/**
 * Append a single NDJSON record describing the outcome of a Cypress spec.
 * All failure modes are swallowed: this writer exists purely for forensics
 * and must never interfere with the test run itself.
 */
export const recordCypressResult = (record: CypressResultRecord): void => {
  try {
    const filePath = getReportFilePath();
    ensureDir(filePath);

    const persisted: PersistedRecord = {
      timestamp: new Date().toISOString(),
      spec: normalizeSpecPath(record.spec),
      kind: record.kind,
      totalFailed: record.totalFailed,
      status: record.status,
      message: record.message,
      durationMs: record.durationMs,
      isRetryRun: record.isRetryRun,
      buildkite: {
        buildNumber: process.env.BUILDKITE_BUILD_NUMBER,
        jobId: process.env.BUILDKITE_JOB_ID,
        stepId: process.env.BUILDKITE_STEP_ID,
        parallelJob: process.env.BUILDKITE_PARALLEL_JOB,
        retryCount: process.env.BUILDKITE_RETRY_COUNT,
        agentName: process.env.BUILDKITE_AGENT_NAME,
      },
    };

    fs.appendFileSync(filePath, `${JSON.stringify(persisted)}\n`);
  } catch {
    // Best-effort: forensic writer must never throw.
  }
};

/**
 * Test-only reset to clear the memoized file path and the "directory already
 * ensured" flag. Intended for unit tests that manipulate process.env between
 * cases.
 */
export const __resetForTesting = (): void => {
  resolvedFilePath = undefined;
  dirEnsured = false;
};
