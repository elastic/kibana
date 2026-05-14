/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Structured error class produced by the classify_execution_failure tool.
 *
 * This enum is a shared contract between `investigate-rule` and the future
 * `diagnose-engine-health` skill. Keep it dependency-free and stateless so
 * it can be promoted to a shared registry tool without rewriting.
 */
export type ExecutionErrorClass =
  | 'index_not_found'
  | 'query_timeout'
  | 'permission_denied'
  | 'schedule_gap'
  | 'circuit_breaker'
  | 'executor_internal_error'
  | 'unknown';

export interface ClassificationResult {
  error_class: ExecutionErrorClass;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

interface PatternGroup {
  error_class: ExecutionErrorClass;
  confidence: 'high' | 'medium' | 'low';
  patterns: RegExp[];
}

const PATTERN_GROUPS: PatternGroup[] = [
  {
    error_class: 'index_not_found',
    confidence: 'high',
    patterns: [
      /index_not_found_exception/i,
      /no such index/i,
      /index(?:es?)?\s+not\s+found/i,
      /index pattern did not match any indices/i,
      /no index matching/i,
    ],
  },
  {
    error_class: 'query_timeout',
    confidence: 'high',
    patterns: [
      /timed[_\s]+out/i,
      /request timed out/i,
      /took too long/i,
      /search_phase_execution_exception.*timed/i,
      /query_shard_exception.*timed/i,
      /EsRejectedExecutionException.*timeout/i,
    ],
  },
  {
    error_class: 'permission_denied',
    confidence: 'high',
    patterns: [
      /security_exception/i,
      /AuthorizationException/i,
      /not authorized to/i,
      /insufficient.*privilege/i,
      /access.?denied/i,
      /\bforbidden\b/i,
    ],
  },
  {
    error_class: 'schedule_gap',
    confidence: 'medium',
    patterns: [
      /execution\s+gap/i,
      /gap\s+in\s+(rule\s+)?execution/i,
      /rule\s+ran\s+behind/i,
      /schedule.*gap/i,
    ],
  },
  {
    error_class: 'circuit_breaker',
    confidence: 'high',
    patterns: [
      /CircuitBreakingException/i,
      /circuit[_\s]*break/i,
      /data too large/i,
      /\[parent\]\s+data too large/i,
    ],
  },
  {
    error_class: 'executor_internal_error',
    confidence: 'medium',
    patterns: [
      /internal server error/i,
      /unhandled\s+(promise\s+)?rejection/i,
      /rule\s+(executor|execution)\s+(internal\s+)?error/i,
      /unexpected\s+error\s+during/i,
    ],
  },
];

/**
 * Pure string-classification function: no ES or Kibana API calls.
 *
 * Takes an error message string and optional rule type, returns a structured
 * classification. Stateless and dependency-free by design so it can be
 * promoted to a shared registry tool when `diagnose-engine-health` ships.
 */
export const classifyExecutionFailure = (
  errorMessage: string,
  _ruleType?: string
): ClassificationResult => {
  if (!errorMessage || errorMessage.trim() === '') {
    return {
      error_class: 'unknown',
      confidence: 'low',
      explanation: 'Empty error message: cannot classify without a message.',
    };
  }

  for (const { error_class, confidence, patterns } of PATTERN_GROUPS) {
    for (const pattern of patterns) {
      if (pattern.test(errorMessage)) {
        return {
          error_class,
          confidence,
          explanation: `Matched "${pattern.source}" pattern for error class "${error_class}".`,
        };
      }
    }
  }

  return {
    error_class: 'unknown',
    confidence: 'low',
    explanation:
      'Error message did not match any known Detection Engine error pattern. ' +
      'Surface the raw message for manual review.',
  };
};
