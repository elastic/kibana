/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorCategory } from '@kbn/discoveries-schemas';

/** Client-side failure category — alias for the shared ErrorCategory from @kbn/discoveries-schemas. */
export type FailureCategory = ErrorCategory;

const includesAny = (lower: string, needles: readonly string[]): boolean =>
  needles.some((needle) => lower.includes(needle));

/**
 * Ordered failure-category rules. More-specific patterns are listed before
 * generic ones. The ordering prevents e.g. "Workflow 'x' is not valid" from
 * matching the generic `workflow_error` bucket instead of `workflow_invalid`.
 */
const CATEGORY_RULES: ReadonlyArray<{
  category: FailureCategory;
  test: (lower: string) => boolean;
}> = [
  // Workflow-specific categories — checked before generic 'workflow' catch-all.
  { category: 'workflow_disabled', test: (l) => includesAny(l, ['is not enabled', 'is disabled']) },
  { category: 'workflow_deleted', test: (l) => l.includes('not found') && l.includes('workflow') },
  {
    category: 'workflow_invalid',
    test: (l) =>
      includesAny(l, [
        'is not valid',
        'missing a definition',
        'has no definition',
        'no step definitions',
      ]),
  },
  // Rate limiting — checked before permission/network to avoid false positives.
  {
    category: 'rate_limit',
    test: (l) => includesAny(l, ['429', 'rate limit', 'too many requests']),
  },
  // Network errors.
  {
    category: 'network_error',
    test: (l) =>
      includesAny(l, ['econnrefused', 'enotfound', 'socket hang up', 'fetch failed', 'etimedout']),
  },
  // Permission errors.
  {
    category: 'permission_error',
    test: (l) =>
      includesAny(l, [
        'forbidden',
        '403',
        'unauthorized',
        '401',
        'insufficient privileges',
        'security_exception',
      ]),
  },
  // Concurrent conflicts (409, version_conflict, generic conflict, or cancellation).
  {
    category: 'concurrent_conflict',
    test: (l) =>
      includesAny(l, ['409', 'version_conflict', 'version conflict', 'conflict', 'was cancelled']),
  },
  // Cluster health issues.
  {
    category: 'cluster_health',
    test: (l) =>
      includesAny(l, [
        'no_shard_available',
        'cluster_block',
        'circuit_breaking_exception',
        'es_rejected_execution',
      ]),
  },
  // Anonymization pipeline errors.
  { category: 'anonymization_error', test: (l) => l.includes('anonymization') },
  // Workflow step registration errors.
  {
    category: 'step_registration_error',
    test: (l) => includesAny(l, ['not registered', 'unknown step', 'step type']),
  },
  // Timeouts — checked before connector to avoid matching "connector timeout".
  // "budget exceeded" is the pipeline-budget (ADR-008) variant of a timeout.
  { category: 'timeout', test: (l) => includesAny(l, ['timeout', 'timed out', 'budget exceeded']) },
  // Interrupted runs (server restart/crash/shutdown mid-execution) — checked before
  // the generic `workflow_error` catch-all so "prior run was interrupted" is not
  // bucketed as a generic workflow error.
  { category: 'interrupted', test: (l) => l.includes('interrupted') },
  // Connector errors.
  { category: 'connector_error', test: (l) => l.includes('connector') },
  // Validation errors — checked before generic workflow catch-all.
  { category: 'validation_error', test: (l) => l.includes('validat') },
  // Generic workflow errors.
  { category: 'workflow_error', test: (l) => l.includes('workflow') },
];

/**
 * Maps an error message string to a structured failure category.
 *
 * More-specific patterns are checked before generic ones. The ordering prevents
 * e.g. "Workflow 'x' is not valid" from matching the generic `workflow_error`
 * bucket instead of `workflow_invalid`.
 */
export const classifyErrorCategory = (reason: string): FailureCategory => {
  const lower = reason.toLowerCase();

  return CATEGORY_RULES.find(({ test }) => test(lower))?.category ?? 'unknown';
};
