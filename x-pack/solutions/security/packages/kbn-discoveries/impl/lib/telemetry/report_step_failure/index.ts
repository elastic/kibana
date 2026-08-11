/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

import { AttackDiscoveryError } from '../../errors/attack_discovery_error';
import { isContextLengthExceededError } from '../../errors/is_context_length_exceeded_error';
import {
  ATTACK_DISCOVERY_STEP_FAILURE_EVENT,
  type ErrorCategory,
  type StepFailureStep,
} from '../event_based_telemetry';

interface ReportStepFailureParams {
  duration_ms?: number;
  error_category: ErrorCategory;
  execution_uuid?: string;
  step: StepFailureStep;
  workflow_id?: string;
}

const includesAny = (lower: string, needles: readonly string[]): boolean =>
  needles.some((needle) => lower.includes(needle));

/**
 * Ordered failure-category rules. More-specific patterns are listed before
 * generic ones so that, e.g., "Workflow 'x' is not valid" maps to
 * `workflow_invalid` rather than the generic `workflow_error` bucket.
 */
const CATEGORY_RULES: ReadonlyArray<{
  category: ErrorCategory;
  test: (lower: string) => boolean;
}> = [
  // Token/context-length overflow is checked first: these messages often arrive
  // wrapped in generic "workflow"/"connector" text, so classifying them before
  // the generic buckets keeps them in the dedicated `context_length_exceeded`
  // category rather than `workflow_error` / `connector_error`.
  {
    category: 'context_length_exceeded',
    test: (l) => isContextLengthExceededError(l),
  },
  {
    category: 'timeout',
    test: (l) => includesAny(l, ['timeout', 'timed out', 'budget exceeded']),
  },
  {
    category: 'rate_limit',
    test: (l) => includesAny(l, ['429', 'rate limit', 'too many requests']),
  },
  // Interrupted runs (server restart/crash/shutdown mid-execution) — checked before
  // the generic `workflow_error` catch-all so "prior run was interrupted" is not
  // bucketed as a generic workflow error.
  { category: 'interrupted', test: (l) => l.includes('interrupted') },
  {
    category: 'network_error',
    test: (l) =>
      includesAny(l, ['econnrefused', 'enotfound', 'socket hang up', 'fetch failed', 'etimedout']),
  },
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
  {
    category: 'concurrent_conflict',
    test: (l) => includesAny(l, ['409', 'version_conflict', 'conflict', 'was cancelled']),
  },
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
  { category: 'connector_error', test: (l) => l.includes('connector') },
  { category: 'anonymization_error', test: (l) => l.includes('anonymization') },
  {
    category: 'step_registration_error',
    test: (l) => includesAny(l, ['not registered', 'unknown step', 'step type']),
  },
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
  { category: 'validation_error', test: (l) => l.includes('validat') },
  { category: 'workflow_error', test: (l) => l.includes('workflow') },
];

export const classifyErrorCategory = (error: unknown): ErrorCategory => {
  if (error instanceof AttackDiscoveryError) {
    return error.errorCategory;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  return CATEGORY_RULES.find(({ test }) => test(lower))?.category ?? 'unknown';
};

export const reportStepFailure = ({
  analytics,
  logger,
  params,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  params: ReportStepFailureParams;
}): void => {
  try {
    analytics.reportEvent(ATTACK_DISCOVERY_STEP_FAILURE_EVENT.eventType, params);
  } catch (error) {
    logger.debug(
      () =>
        `Failed to report ${ATTACK_DISCOVERY_STEP_FAILURE_EVENT.eventType} telemetry: ${error.message}`
    );
  }
};
