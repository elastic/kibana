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
import type { ALERT_TRIAGE_REPORTABLE_EVENTS } from './alert_triage';

export const ALERT_TRIAGE_INPUT_FIXTURES: ReportableEventFixtures<
  typeof ALERT_TRIAGE_REPORTABLE_EVENTS
> = {
  alert_triage_batch_classified: {
    alerts_total: 40,
    alerts_without_verdict: 2,
    fp_below_floor: 3,
    fp_candidates: 20,
    investigation_id: INVESTIGATION_ID_FIXTURE,
    verdicts_false_positive: 23,
    verdicts_inconclusive: 5,
    verdicts_true_positive: 10,
  },
  alert_triage_batch_grouped: {
    alerts_joined: 0,
    alerts_pooled: 0,
    alerts_with_strict_key: 36,
    conversation_created: false,
    fp_candidates_on_fallback: 4,
    grouping: 'on',
    proposals_created: 0,
    strict_keys: 12,
    strict_keys_single_alert: 5,
    wide_keys: 8,
    wide_keys_single_alert: 3,
  },
  alert_triage_closure_resolved: {
    alerts_proposed: 20,
    alerts_retag_failed: 0,
    revisions: 1,
    auto_approve_requested: false,
    investigation_id: INVESTIGATION_ID_FIXTURE,
    outcome: 'dismissed',
    proposal_read_failed: false,
  },
};
