/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * ============================================================================
 * UNRATIFIED — spike-local orchestration-identity primitives.
 * ============================================================================
 *
 * These three primitives (execution-subject separation, run-as role scoping,
 * and the orchestration.workers allowlist) implement Family D gates D1, D2 and
 * D5 against a WORKING LOCAL contract while the platform shapes are still open:
 *
 *   - D1/D2 depend on platform run-as / UIAM execution identity (#17942).
 *   - D5 depends on the still-open `orchestration.workers` field vs.
 *     graph-as-allowlist decision.
 *
 * Per the spike's "define a working schema locally when the platform contract
 * lags, align later" rule, we build the most-likely shape now, fail-closed, so
 * the gates run for real instead of sitting skipped. When #17942 / the
 * allowlist decision land, the enforcement seam here is replaced by the
 * platform primitive with NO change to the routes or specs that call it.
 *
 * Every default below is overridable via an env escape hatch so an operator can
 * realign to a ratified shape (or disable enforcement) without a code change.
 * ============================================================================
 */

/**
 * The Watch Orchestrator executes Workers under a non-human SERVICE ACCOUNT
 * (the execution subject). This is deliberately distinct from the APPROVAL
 * subject — the human analyst who authorizes a consequential action at the
 * Shared Approval Gate. D1 asserts these two are never the same principal.
 *
 * UNRATIFIED: the real service-account principal arrives with run-as/UIAM
 * (#17942). Override via `PND_EXECUTION_SUBJECT`.
 */
export const DEFAULT_EXECUTION_SUBJECT =
  process.env.PND_EXECUTION_SUBJECT ?? 'service-account:watch-orchestrator';

/**
 * The approval subject is a human analyst. The accept-proposal route stamps
 * this as the approver; it must never equal the execution subject.
 *
 * UNRATIFIED: the real approver identity arrives with platform HITL (#17944).
 * Override via `PND_APPROVAL_SUBJECT`.
 */
export const DEFAULT_APPROVAL_SUBJECT = process.env.PND_APPROVAL_SUBJECT ?? 'analyst';

/**
 * orchestration.workers allowlist (D5). The Orchestrator may invoke ONLY these
 * Worker tiers. Anything else is refused fail-closed — an Orchestrator graph
 * that references a Worker outside this set cannot dispatch it.
 *
 * UNRATIFIED: this is the `orchestration.workers` field shape (vs.
 * graph-as-allowlist). Override via `PND_ORCHESTRATION_WORKERS` (comma-sep).
 */
export const DEFAULT_ORCHESTRATION_WORKERS: readonly string[] = (
  process.env.PND_ORCHESTRATION_WORKERS ??
  'watch-floor,watch-officer,watch-dark,watch-deep,watch-detection,watch-ad'
)
  .split(',')
  .map((w) => w.trim())
  .filter((w) => w.length > 0);

/**
 * run-as role scoping (D2). Each Worker tier runs under a narrow role that
 * grants read only to its own telemetry index patterns. A read outside the
 * granted scope is denied fail-closed and the run is surfaced as blocked.
 *
 * UNRATIFIED: the real role→index grants arrive with run-as/UIAM (#17942).
 * These mirror the DEEP_WATCH_INDICES the forensic worker legitimately reads
 * plus the alert index every tier needs.
 */
export const DEFAULT_RUN_AS_ROLE_SCOPES: Readonly<Record<string, readonly string[]>> = {
  'watch-floor': ['.alerts-security.alerts-*', 'logs-endpoint.alerts-*'],
  'watch-dark': ['.alerts-security.alerts-*', 'logs-endpoint.events.*'],
  'watch-deep': [
    '.alerts-security.alerts-*',
    'logs-endpoint.events.process-*',
    'logs-endpoint.events.network-*',
    'logs-endpoint.events.file-*',
    'logs-endpoint.events.registry-*',
  ],
  'watch-detection': ['.alerts-security.alerts-*', '.kibana-*'],
  'watch-ad': ['.alerts-security.alerts-*', 'logs-endpoint.events.*'],
  'watch-officer': ['.alerts-security.alerts-*'],
};

/**
 * Master enforcement switch. Defaults ON (fail-closed). An operator realigning
 * to a ratified platform primitive can disable this layer with
 * `PND_ORCHESTRATION_IDENTITY_ENFORCE=0` rather than deleting code.
 */
export const ORCHESTRATION_IDENTITY_ENFORCED =
  process.env.PND_ORCHESTRATION_IDENTITY_ENFORCE !== '0';

/** Reason codes surfaced to the caller and written to the audit trail. */
export type OrchestrationDenyReason = 'worker-not-allowlisted' | 'index-out-of-run-as-scope';

export class OrchestrationIdentityError extends Error {
  constructor(
    public readonly reason: OrchestrationDenyReason,
    public readonly detail: {
      worker: string;
      requestedIndex?: string;
      allowedScopes?: readonly string[];
    }
  ) {
    super(
      reason === 'worker-not-allowlisted'
        ? `Worker "${detail.worker}" is not in the orchestration.workers allowlist`
        : `Worker "${detail.worker}" run-as role does not grant read to "${detail.requestedIndex}"`
    );
    this.name = 'OrchestrationIdentityError';
  }
}

/**
 * The execution identity stamped on every artifact a Worker run produces.
 * `isSeparated` is the D1 invariant: execution subject ≠ approval subject.
 */
export interface ExecutionIdentity {
  executionSubject: string;
  approvalSubject: string;
  isSeparated: boolean;
}

/**
 * Build the execution identity for a run (D1). The two subjects come from
 * distinct principals; `isSeparated` is false only if an operator mis-configures
 * both env overrides to the same value — which the accept-gate rejects.
 */
export const buildExecutionIdentity = (
  executionSubject: string = DEFAULT_EXECUTION_SUBJECT,
  approvalSubject: string = DEFAULT_APPROVAL_SUBJECT
): ExecutionIdentity => ({
  executionSubject,
  approvalSubject,
  isSeparated: executionSubject !== approvalSubject,
});

/**
 * D5 — fail-closed allowlist check. Throws OrchestrationIdentityError unless the
 * worker is explicitly allowlisted. A no-op when enforcement is disabled.
 */
export const assertWorkerAllowlisted = (
  worker: string,
  allowlist: readonly string[] = DEFAULT_ORCHESTRATION_WORKERS
): void => {
  if (!ORCHESTRATION_IDENTITY_ENFORCED) return;
  if (!allowlist.includes(worker)) {
    throw new OrchestrationIdentityError('worker-not-allowlisted', { worker });
  }
};

/**
 * D2 — fail-closed run-as scope check. Throws unless the requested index is
 * covered by one of the worker's granted patterns. Unknown worker → no grants →
 * denied. A no-op when enforcement is disabled.
 */
export const assertIndexInRunAsScope = (
  worker: string,
  requestedIndex: string,
  scopes: Readonly<Record<string, readonly string[]>> = DEFAULT_RUN_AS_ROLE_SCOPES
): void => {
  if (!ORCHESTRATION_IDENTITY_ENFORCED) return;
  const grants = scopes[worker] ?? [];
  if (!grants.some((pattern) => indexMatchesPattern(requestedIndex, pattern))) {
    throw new OrchestrationIdentityError('index-out-of-run-as-scope', {
      worker,
      requestedIndex,
      allowedScopes: grants,
    });
  }
};

/**
 * Minimal ES-style index-pattern match: a single trailing `*` is a prefix
 * wildcard; an embedded `*` matches any run of non-comma chars. Deterministic,
 * no regex injection from caller input (pattern is server-owned config).
 */
export const indexMatchesPattern = (index: string, pattern: string): boolean => {
  if (pattern === index) return true;
  if (!pattern.includes('*')) return false;
  const escaped = pattern
    .split('*')
    .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^,]*');
  return new RegExp(`^${escaped}$`).test(index);
};
