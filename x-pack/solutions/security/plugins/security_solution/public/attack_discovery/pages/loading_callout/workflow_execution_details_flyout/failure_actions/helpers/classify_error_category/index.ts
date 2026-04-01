/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorCategory } from '@kbn/discoveries-schemas';

/** Client-side failure category — alias for the shared ErrorCategory from @kbn/discoveries-schemas. */
export type FailureCategory = ErrorCategory;

/**
 * Maps an error message string to a structured failure category.
 *
 * More-specific patterns are checked before generic ones. The ordering prevents
 * e.g. "Workflow 'x' is not valid" from matching the generic `workflow_error`
 * bucket instead of `workflow_invalid`.
 */
export const classifyErrorCategory = (reason: string): FailureCategory => {
  const lower = reason.toLowerCase();

  // Workflow-specific categories — checked before generic 'workflow' catch-all.
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

  // Rate limiting — checked before permission/network to avoid false positives.
  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'rate_limit';
  }

  // Network errors.
  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('socket hang up') ||
    lower.includes('fetch failed') ||
    lower.includes('etimedout')
  ) {
    return 'network_error';
  }

  // Permission errors.
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

  // Concurrent conflicts (409, version_conflict, generic conflict, or cancellation).
  if (
    lower.includes('409') ||
    lower.includes('version_conflict') ||
    lower.includes('version conflict') ||
    lower.includes('conflict') ||
    lower.includes('was cancelled')
  ) {
    return 'concurrent_conflict';
  }

  // Cluster health issues.
  if (
    lower.includes('no_shard_available') ||
    lower.includes('cluster_block') ||
    lower.includes('circuit_breaking_exception') ||
    lower.includes('es_rejected_execution')
  ) {
    return 'cluster_health';
  }

  // Anonymization pipeline errors.
  if (lower.includes('anonymization')) {
    return 'anonymization_error';
  }

  // Workflow step registration errors.
  if (
    lower.includes('not registered') ||
    lower.includes('unknown step') ||
    lower.includes('step type')
  ) {
    return 'step_registration_error';
  }

  // Timeouts — checked before connector to avoid matching "connector timeout".
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'timeout';
  }

  // Connector errors.
  if (lower.includes('connector')) {
    return 'connector_error';
  }

  // Validation errors — checked before generic workflow catch-all.
  if (lower.includes('validat')) {
    return 'validation_error';
  }

  // Generic workflow errors.
  if (lower.includes('workflow')) {
    return 'workflow_error';
  }

  return 'unknown';
};
