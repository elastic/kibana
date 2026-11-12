/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVELOPE_FIXTURE as envelope } from '../worker_event_fields.fixture';
import {
  RULE_COVERAGE_TELEMETRY_EVENTS,
  type RuleCoverageTelemetryEventPayloads,
} from './rule_coverage';

export const RULE_COVERAGE_EVENT_FIXTURES: RuleCoverageTelemetryEventPayloads = {
  [RULE_COVERAGE_TELEMETRY_EVENTS.RuleCoverageReviewCompleted]: {
    ...envelope,
    applied: true,
    approved_not_applied: false,
    check_failed: false,
    creation_failed: false,
    creation_skipped: false,
    decision: 'approved',
    entry_gate: 'skipped',
    investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
    ki_processed: true,
    proposal_kind: 'enable_rule',
    rule_created: false,
    rule_source: 'prebuilt',
    rule_type: 'eql',
    verdict: 'covered_disabled',
    watch_tag: 'watch-detection',
    worker_id: 'system-security-detection-rule-coverage',
  },
};
