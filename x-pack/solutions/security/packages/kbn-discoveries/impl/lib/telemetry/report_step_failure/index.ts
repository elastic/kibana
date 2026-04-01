/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

import { AttackDiscoveryError } from '../../errors/attack_discovery_error';
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

export const classifyErrorCategory = (error: unknown): ErrorCategory => {
  if (error instanceof AttackDiscoveryError) {
    return error.errorCategory;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'timeout';
  }

  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'rate_limit';
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('socket hang up') ||
    lower.includes('fetch failed') ||
    lower.includes('etimedout')
  ) {
    return 'network_error';
  }

  if (
    lower.includes('forbidden') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('insufficient privileges') ||
    lower.includes('security_exception')
  ) {
    return 'permission_error';
  }

  if (
    lower.includes('409') ||
    lower.includes('version_conflict') ||
    lower.includes('conflict') ||
    lower.includes('was cancelled')
  ) {
    return 'concurrent_conflict';
  }

  if (
    lower.includes('no_shard_available') ||
    lower.includes('cluster_block') ||
    lower.includes('circuit_breaking_exception') ||
    lower.includes('es_rejected_execution')
  ) {
    return 'cluster_health';
  }

  if (lower.includes('connector')) {
    return 'connector_error';
  }

  if (lower.includes('anonymization')) {
    return 'anonymization_error';
  }

  if (
    lower.includes('not registered') ||
    lower.includes('unknown step') ||
    lower.includes('step type')
  ) {
    return 'step_registration_error';
  }

  if (lower.includes('is not enabled') || lower.includes('is disabled')) {
    return 'workflow_disabled';
  }

  if (lower.includes('not found') && lower.includes('workflow')) {
    return 'workflow_deleted';
  }

  if (
    lower.includes('is not valid') ||
    lower.includes('missing a definition') ||
    lower.includes('has no definition') ||
    lower.includes('no step definitions')
  ) {
    return 'workflow_invalid';
  }

  if (lower.includes('validat')) {
    return 'validation_error';
  }

  if (lower.includes('workflow')) {
    return 'workflow_error';
  }

  return 'unknown';
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
