/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolutionRuleHealth } from './hooks/use_resolution_rules_health';

/**
 * PROTOTYPE: plain text a user can paste to a developer. It holds only what the maintainer saved:
 * the error message (cut at 500 characters) and the failure streak. There is no stack trace.
 */
export const buildRuleFailureReport = ({
  rule_id: ruleId,
  failure,
}: ResolutionRuleHealth): string =>
  [
    `Rule: ${ruleId}`,
    `Error: ${failure?.last_error ?? 'unknown'}`,
    `Failures in a row: ${failure?.consecutive_failures ?? 0}`,
    `Last failed at: ${failure?.last_failed_at ?? 'unknown'}`,
    `Next attempt at: ${failure?.next_attempt_at ?? 'unknown'}`,
  ].join('\n');
