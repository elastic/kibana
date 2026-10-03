/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportWorkerOutcomeStepInput } from './report_worker_outcome_step';

/**
 * Fixed descriptions of every way a parsed outcome contradicts itself; empty when it does not.
 * A `degraded_partial` run must say why, so the server step skips one without a reason as
 * `invalid_input`. Kept out of the input schema, so each event stays a plain object schema for
 * the YAML editor.
 */
export const findOutcomeContradictions = (input: ReportWorkerOutcomeStepInput): string[] => {
  if (input.event !== 'worker_run_completed') {
    return [];
  }
  return input.run_outcome === 'degraded_partial' && input.degraded_reason === 'none'
    ? ['run_outcome degraded_partial requires a degraded_reason other than none']
    : [];
};
