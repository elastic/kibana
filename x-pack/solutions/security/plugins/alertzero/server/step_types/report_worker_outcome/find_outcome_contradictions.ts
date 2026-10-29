/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportWorkerOutcomeStepInput } from '../../../common/step_types';

/**
 * Fixed descriptions of every way a parsed outcome contradicts itself; empty when it does not.
 * A `degraded_partial` run must say why, and an event whose Investigation id may be absent must
 * name the one case that leaves it absent, so the server step skips either as `invalid_input`.
 * Kept out of the input schema, so each event stays a plain object schema for the YAML editor.
 */
export const findOutcomeContradictions = (input: ReportWorkerOutcomeStepInput): string[] => {
  switch (input.event) {
    case 'worker_run_completed':
      return input.run_outcome === 'degraded_partial' && input.degraded_reason === 'none'
        ? ['run_outcome degraded_partial requires a degraded_reason other than none']
        : [];
    case 'rule_tuning_review_completed':
      return input.investigation_id === undefined && !input.rule_unavailable
        ? ['rule_tuning_review_completed without investigation_id requires rule_unavailable']
        : [];
    case 'rule_coverage_review_completed':
      return input.investigation_id === undefined && !input.check_failed
        ? ['rule_coverage_review_completed without investigation_id requires check_failed']
        : [];
    case 'hunt_report_completed':
      return input.investigation_id === undefined && input.package_status !== 'run_incomplete'
        ? ['hunt_report_completed without investigation_id requires package_status run_incomplete']
        : [];
    default:
      return [];
  }
};
