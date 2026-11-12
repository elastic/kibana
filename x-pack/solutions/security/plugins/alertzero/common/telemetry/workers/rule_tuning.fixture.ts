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
import type { RULE_TUNING_REPORTABLE_EVENTS } from './rule_tuning';

export const RULE_TUNING_INPUT_FIXTURES: ReportableEventFixtures<
  typeof RULE_TUNING_REPORTABLE_EVENTS
> = {
  rule_tuning_review_completed: {
    applied: true,
    approved_not_applied: false,
    backtest_ran: true,
    backtest_reduced_alerts: true,
    change_type: 'query',
    confidence: 'high',
    decision: 'approved',
    entry_gate: 'skipped',
    investigation_id: INVESTIGATION_ID_FIXTURE,
    rule_source: 'prebuilt',
    rule_type: 'query',
    rule_unavailable: false,
  },
};
