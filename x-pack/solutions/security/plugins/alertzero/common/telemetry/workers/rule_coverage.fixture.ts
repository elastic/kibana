/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVESTIGATION_ID_FIXTURE,
  type ReportableEventFixtures,
} from '../report_step_input_fields.fixture';
import type { RULE_COVERAGE_REPORTABLE_EVENTS } from './rule_coverage';

export const RULE_COVERAGE_INPUT_FIXTURES: ReportableEventFixtures<
  typeof RULE_COVERAGE_REPORTABLE_EVENTS
> = {
  rule_coverage_review_completed: {
    applied: false,
    approved_not_applied: false,
    check_failed: false,
    creation_failed: false,
    creation_skipped: false,
    decision: 'approved',
    entry_gate: 'skipped',
    investigation_id: INVESTIGATION_ID_FIXTURE,
    ki_processed: true,
    proposal_kind: 'create_rule',
    rule_created: true,
    rule_source: 'custom',
    rule_type: 'esql',
    verdict: 'no_coverage',
  },
};
