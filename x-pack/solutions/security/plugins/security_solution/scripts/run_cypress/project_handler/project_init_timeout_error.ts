/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Process exit code when MKI initialization times out ({@link ProjectInitTimeoutError}).
 *
 * Pair with Buildkite `soft_fail.exit_status` so only infra-style failures are soft —
 * Cypress / app failures keep using exit code 1 or other tooling codes.
 *
 * ```yaml
 * soft_fail:
 *   exit_status:
 *     - 101
 * ```
 */
export const PROJECT_INIT_TIMEOUT_EXIT_CODE = 101;

export interface ProjectInitTimeoutErrorOptions {
  projectId: string;
  /** Last `/status` `phase`, if any attempt returned a response. */
  lastPhase: string | undefined;
  attempts: number;
  /** Aggregate error from p-retry after retries are exhausted. */
  cause: unknown;
}

/**
 * Raised when MKI never reaches phase `initialized` within the allotted retries.
 * Clearer for CI logs than repeating the transient "retry soon" Error.
 */
export class ProjectInitTimeoutError extends Error {
  readonly projectId: string;
  readonly lastPhase: string | undefined;
  readonly attempts: number;
  /** The last error rejected by p-retry before giving up. */
  readonly exhaustedCause: Error;

  constructor(opts: ProjectInitTimeoutErrorOptions) {
    const { projectId, lastPhase, attempts, cause } = opts;

    super(
      `Project ${projectId} did not reach 'initialized' after ${attempts} attempts (last observed phase: ${
        lastPhase ?? 'unknown'
      }). This often reflects MKI backlog or capacity during congestion — retry later or escalate.`
    );

    this.name = 'ProjectInitTimeoutError';
    Object.setPrototypeOf(this, ProjectInitTimeoutError.prototype);
    this.projectId = projectId;
    this.lastPhase = lastPhase;
    this.attempts = attempts;
    this.exhaustedCause = toError(cause);
  }
}

export function isProjectInitTimeoutError(e: unknown): e is ProjectInitTimeoutError {
  return e instanceof ProjectInitTimeoutError;
}

function toError(raw: unknown): Error {
  if (!raw || typeof raw !== 'object') return new Error(String(raw));

  const r = raw as { lastAttemptError?: unknown };
  if (r.lastAttemptError instanceof Error) return r.lastAttemptError;
  if (raw instanceof Error) return raw;

  try {
    return new Error(JSON.stringify(raw));
  } catch {
    return new Error(String(raw));
  }
}
