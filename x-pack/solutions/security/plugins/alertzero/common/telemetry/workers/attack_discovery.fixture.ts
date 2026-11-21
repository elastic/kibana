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
import type { ATTACK_DISCOVERY_REPORTABLE_EVENTS } from './attack_discovery';

/** The `ad_worker_analysis_completed` entry is the minimal input the report step's cases build on. */
export const ATTACK_DISCOVERY_INPUT_FIXTURES: ReportableEventFixtures<
  typeof ATTACK_DISCOVERY_REPORTABLE_EVENTS
> = {
  ad_worker_analysis_completed: { verdict: 'false_positive' },
  ad_worker_handoff_resolved: {
    auto_approve_requested: false,
    outcome: 'approved',
    verdict: 'true_positive',
  },
  ad_worker_review_started: {
    investigation_id: INVESTIGATION_ID_FIXTURE,
    is_rereview: false,
  },
  ad_worker_run_completed: {
    alerts_analyzed: 120,
    attacks_generated: 4,
    attacks_persisted: 3,
    batches_failed: 1,
    batches_total: 6,
    run_outcome: 'produced',
  },
};
