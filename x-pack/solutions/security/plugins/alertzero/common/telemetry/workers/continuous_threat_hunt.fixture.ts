/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UUID_V5_INVESTIGATION_ID_FIXTURE,
  type ReportableEventFixtures,
} from '../report_step_input_fields.fixture';
import type { CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS } from './continuous_threat_hunt';

export const CONTINUOUS_THREAT_HUNT_INPUT_FIXTURES: ReportableEventFixtures<
  typeof CONTINUOUS_THREAT_HUNT_REPORTABLE_EVENTS
> = {
  hunt_report_completed: {
    closed_clean: false,
    coverage_kis_skipped: 1,
    coverage_kis_written: 2,
    has_confirmed_hit: true,
    hunt_status: 'success',
    investigation_id: UUID_V5_INVESTIGATION_ID_FIXTURE,
    mint_suppression: 'none',
    package_status: 'success',
    proposals_dispatch_failed: 0,
    proposals_prepared: 3,
    tier2_invoked: true,
  },
};
