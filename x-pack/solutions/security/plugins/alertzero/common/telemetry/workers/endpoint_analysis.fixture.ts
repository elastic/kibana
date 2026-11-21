/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReportableEventFixtures } from '../report_step_input_fields.fixture';
import type { ENDPOINT_ANALYSIS_REPORTABLE_EVENTS } from './endpoint_analysis';

export const ENDPOINT_ANALYSIS_INPUT_FIXTURES: ReportableEventFixtures<
  typeof ENDPOINT_ANALYSIS_REPORTABLE_EVENTS
> = {
  endpoint_analysis_completed: {
    actions_recommended: 2,
    agent_failed: false,
    analysis_outcome: 'processed',
    auto_approve_requested: false,
    findings_attached: true,
    host_resolved: true,
    iocs_found: true,
    proposals_dispatch_failed: 0,
    proposals_dispatched: 2,
    reused_prior_assessment: false,
    timeline_found: true,
  },
};
